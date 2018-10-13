// understanding webgl state
// https://stackoverflow.com/a/28641368
// https://stackoverflow.com/a/39972830
// https://stackoverflow.com/a/27164577

// -- one time setup
// create shaders
// create program
// create textures
//
// getAttribLocation (attributes are arguments to shader programs)
// getUniformLocation (uniforms are global vars in shader programs)
//
// -- changes on data change
//
// sending data to the GPU:
//
// buffers (the raw data on the gpu)
// - createBuffer
// - bindBuffer
// - bufferData
//
// THEN
//
// vertex arrays (which attribute to bind the buffer data to, how to read the data, etc.)
// - createVertexArray
// - bindVertexArray
// - enabledVertexAttribArray
// - vertexAttribPointer

// uniforms (global variables)
// -> gl.uniform[1/2/3/4](i - int/ui - unsigned int/f - float)(v - vector)
//
// -- render loop
// if needed -> resize canvas
// if needed -> gl.viewport()
// if needed -> gl.clearColor()
// if needed -> gl.clear()
// if program changed -> gl.useProgram()
//
// gl.drawArrays -OR- gl.drawElements

interface VertexArrayPointer {
  size: number
  type: number
  normalize?: boolean
  stride?: number
  offset?: number
}

export const WebGL2 = () => {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') as WebGL2RenderingContext

  const resize = (width = canvas.clientWidth, height = canvas.clientHeight) => {
    const w = Math.floor(width * window.devicePixelRatio)
    const h = Math.floor(height * window.devicePixelRatio)

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      gl.viewport(0, 0, w, h)
    }
  }

  const createShader = (type: number, source: string) => {
    const shaderSource = '#version 300 es\n' + source
    const shader = gl.createShader(type)
    if (!shader) return console.error('failed to create gl shader. oops.')

    gl.shaderSource(shader, shaderSource)
    gl.compileShader(shader)

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    if (success) return shader

    console.error(gl.getShaderInfoLog(shader), source)
    gl.deleteShader(shader)
  }

  const createProgramWithShaders = (vertexShader: WebGLShader, fragmentShader: WebGLShader) => {
    const program = gl.createProgram()
    if (!program) return console.error('failed to create gl program. oops.')

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    const success = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (success) return program

    console.error(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
  }

  const createProgram = (vertexShader: string, fragmentShader: string) => {
    const vshader = createShader(gl.VERTEX_SHADER, vertexShader)
    const fshader = createShader(gl.FRAGMENT_SHADER, fragmentShader)
    if (!vshader || !fshader) return console.error('failed to create shaders - cant create program. sorry bout that')
    return createProgramWithShaders(vshader, fshader)
  }

  const setupCanvasTexture = (canvas: HTMLCanvasElement, textureUnit = gl.TEXTURE0) => {
    gl.activeTexture(textureUnit)
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
  }

  const setupArrayBuffer = (data: Float32Array) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
  }

  const setupVertexArray = (attribPos: number, options: VertexArrayPointer) => {
    const { size, type, normalize = false, stride = 0, offset = 0 } = options
    gl.bindVertexArray(gl.createVertexArray())
    gl.enableVertexAttribArray(attribPos)
    gl.vertexAttribPointer(attribPos, size, type, normalize, stride, offset)
  }

  return { createProgram, canvas, gl, setupCanvasTexture, setupArrayBuffer, setupVertexArray, resize }
}
