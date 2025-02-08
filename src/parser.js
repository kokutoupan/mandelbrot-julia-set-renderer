class Token {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}

class Lexer {
    constructor(input) {
        this.input = input;
        this.position = 0;
    }

    getNextToken() {
        while (this.position < this.input.length) {
            let char = this.input[this.position];

            if (char === ' ') {
                this.position++;
                continue;
            }

            if (/[a-zA-Z_]/.test(char)) {
                let varName = '';
                while (/[a-zA-Z0-9_]/.test(this.input[this.position])) {
                    varName += this.input[this.position];
                    this.position++;
                }
                if (this.input[this.position] === '(') {
                    return new Token('FUNCTION', varName);
                }
                if (varName === 'z' || varName === 'C') {
                    return new Token('COMPLEX', varName);
                }
                if (varName === 'i') {
                    return new Token('COMPLEX', 'vec2(0,1)');
                }
                return new Token('VARIABLE', varName);
            }

            if (/[0-9]/.test(char)) {
                let num = '';
                while (/[0-9]/.test(this.input[this.position])) {
                    num += this.input[this.position];
                    this.position++;
                }
                if ('.' === this.input[this.position]) {
                    num += this.input[this.position]
                    this.position++;
                }
                while (/[0-9]/.test(this.input[this.position])) {
                    num += this.input[this.position];
                    this.position++;
                }
                if ('i' === this.input[this.position]) {
                    this.position++;
                    return new Token('COMPLEX', 'vec2(0,' + num + ')');
                }
                return new Token('NUMBER', 'float(' + num + ')');
            }

            if ('+-*/=(),'.includes(char)) {
                this.position++;
                return new Token('OPERATOR', char);
            }

            throw new Error(`Unexpected character: ${char}`);
        }
        return new Token('EOF', null);
    }
}

class Parser {
    constructor(lexer) {
        this.lexer = lexer;
        this.currentToken = this.lexer.getNextToken();
    }

    eat(tokenType) {
        if (this.currentToken.type === tokenType) {
            this.currentToken = this.lexer.getNextToken();
        } else {
            throw new Error(`Unexpected token: ${this.currentToken.value}`);
        }
    }

    factor() {
        let token = this.currentToken;
        if (token.type === 'NUMBER') {
            this.eat('NUMBER');
            return { value: token.value, isComplex: false };
        } else if (token.type === 'VARIABLE' || token.type === 'COMPLEX') {
            this.eat(token.type);
            return { value: token.value, isComplex: token.type === 'COMPLEX' };
        } else if (token.type === 'FUNCTION') {
            let funcName = token.value;
            this.eat('FUNCTION');
            this.eat('OPERATOR'); // Expect '('
            let args = [];
            if (this.currentToken.value !== ')') {
                args.push(this.expression());
                while (this.currentToken.value === ',') {
                    this.eat('OPERATOR'); // Consume ','
                    args.push(this.expression());
                }
            }
            this.eat('OPERATOR'); // Expect ')'
            return { value: `${funcName}(${args.map(a => a.value).join(', ')})`, isComplex: false };
        } else if (token.value === '(') {
            this.eat('OPERATOR');
            let node = this.expression();
            this.eat('OPERATOR'); // Expect ')'
            return node;
        }
        throw new Error(`Unexpected token in factor: ${token.value}`);
    }

    term() {
        let node = this.factor();
        while (this.currentToken.type === 'OPERATOR' && '*/'.includes(this.currentToken.value)) {
            let token = this.currentToken;
            this.eat('OPERATOR');
            let right = this.factor();
            let op;

            op = token.value === '*' ? 'mult' : 'div';

            node = { value: `${op}(${node.value}, ${right.value})`, isComplex: node.isComplex || right.isComplex };
        }
        return node;
    }

    expression() {
        let node = this.term();
        while (this.currentToken.type === 'OPERATOR' && '+-'.includes(this.currentToken.value)) {
            let token = this.currentToken;
            this.eat('OPERATOR');
            let right = this.term();
            let op;

            op = token.value === '+' ? 'add' : 'sub';
            node = { value: `${op}(${node.value}, ${right.value})`, isComplex: node.isComplex || right.isComplex };
        }
        return node;
    }

    assignment() {
        if (this.currentToken.type === 'VARIABLE' || this.currentToken.type === 'COMPLEX') {
            let varName = this.currentToken.value;
            this.eat(this.currentToken.type);
            this.eat('OPERATOR'); // Expect '='
            let expr = this.expression();
            return `${varName} = ${expr.value}`;
        }
        return this.expression().value;
    }

    parse() {
        return this.assignment();
    }
}

export function parseExpression(input) {
    let lexer = new Lexer(input);
    let parser = new Parser(lexer);
    return parser.parse();
}

// テスト
// console.log(parseExpression("z =sin(x, y) * (3 + c) * 2 - 8 / (4 + 1)"));