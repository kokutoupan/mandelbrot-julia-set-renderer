import { expressionToShader } from "./expressionShader.js";

export class Renderer {

    vs = null;

    uboBlockIndex = null;

    constructor(canvas) {
        this.canvas = canvas;
        const gl = canvas.getContext('webgl2');
        this.gl = gl;
        if (!this.gl) {
            console.error("WebGL2 is not supported in your browser");
            return;
        }

        this.vs = this.createVertexShader();

        const position = [-1.0, 1.0, 0.0, 1.0, 1.0, 0.0, -1.0, -1.0, 0.0, 1.0, -1.0, 0.0];
        const index = [0, 2, 1, 1, 2, 3];
        this.vPosition = this.createVbo(position);
        this.vIndex = this.createIbo(index);


        // this.uboData = new Float32Array([
        //     0.0, // mouse.x
        //     0.0, // mouse.y
        //     0.0, // resolution.x
        //     0.0, // resolution.y
        //     0.0, // offset.x
        //     0.0, // offset.y
        //     0.0, // time
        //     0.0, // zoom
        // ]);

        this.ubo = gl.createBuffer();
        gl.bindBuffer(gl.UNIFORM_BUFFER, this.ubo);
        gl.bufferData(gl.UNIFORM_BUFFER, 8 * 4 * 4, gl.DYNAMIC_DRAW);
    }


    resetShader(userInput, mode) {
        console.log("resetShader");
        const gl = this.gl;
        const fs = expressionToShader(userInput, mode);

        const prg = this.createProgram(this.vs, this.createFragmentShader(fs));


        const vAttLocation = gl.getAttribLocation(prg, 'position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vPosition);
        gl.enableVertexAttribArray(vAttLocation);
        gl.vertexAttribPointer(vAttLocation, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vIndex);

        this.uboBlockIndex = gl.getUniformBlockIndex(prg, "ShaderData"); // ← ここ重要！
        gl.uniformBlockBinding(prg, this.uboBlockIndex, 0);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, this.ubo);


        gl.clearColor(0.0, 0.0, 0.0, 1.0);
    }

    render(updatedUniformData) {

        const gl = this.gl;

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.UNIFORM_BUFFER, this.ubo);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, updatedUniformData);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        gl.flush();
    }

    createVbo(data) {
        const gl = this.gl;
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return vbo;
    }

    createIbo(data) {
        const gl = this.gl;
        const ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        return ibo;
    }

    createVertexShader() {
        const gl = this.gl;

        const vs =`#version 300 es
        in vec3 position;
        void main(void){
            gl_Position = vec4(position, 1.0);
        }`;

        const shader = gl.createShader(gl.VERTEX_SHADER);


        gl.shaderSource(shader, vs);
        gl.compileShader(shader);

        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            return shader;
        } else {
            alert(gl.getShaderInfoLog(shader));
            console.log(gl.getShaderInfoLog(shader));
        }
    }

    createFragmentShader(fs) {
        const gl = this.gl;
        const shader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(shader, fs);
        gl.compileShader(shader);

        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            return shader;
        } else {
            alert(gl.getShaderInfoLog(shader));
            console.log(gl.getShaderInfoLog(shader));
        }

        return shader;
    }
    createProgram(vs, fs) {
        const gl = this.gl;

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.useProgram(program);
            return program;
        } else {
            return null;
        }
    }
}