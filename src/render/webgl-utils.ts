// understanding webgl state
// https://stackoverflow.com/a/28641368
// https://stackoverflow.com/a/39972830
// https://stackoverflow.com/a/27164577

export const WebGL2 = () => {
  const canvas = document.createElement('canvas')
  // TODO: need webgl2 typings
  // possibly: https://github.com/MaxGraey/WebGL2-TypeScript
  const gl = canvas.getContext('webgl2') as WebGLRenderingContext

  const createShader = (type: number, source: string) => {
    const shaderSource = '#version 300 es\n' + source
    const shader = gl.createShader(type)

    gl.shaderSource(shader, shaderSource)
    gl.compileShader(shader)

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    if (success) return shader

    console.log(gl.getShaderInfoLog(shader), source)
    gl.deleteShader(shader)
  }

  const createProgramWithShaders = (vertexShader: WebGLShader, fragmentShader: WebGLShader) => {
    const program = gl.createProgram()

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    const success = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (success) return program

    console.log(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
  }

  const createProgram = (vertexShader: string, fragmentShader: string) => {
    const vshader = createShader(gl.VERTEX_SHADER, vertexShader)
    const fshader = createShader(gl.FRAGMENT_SHADER, fragmentShader)
    if (!vshader || !fshader) return console.error('failed to create shaders - cant create program. sorry bout that')
    return createProgramWithShaders(vshader, fshader)
  }

  const setupCanvasTexture = (canvas: HTMLCanvasElement) => {
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  const setupArrayBuffer = (data: Float32Array) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
  }

  const setupVertexArray = (attribPos: number) => {
    gl.bindVertexArray(gl.createVertexArray)
    gl.enableVertexAttribArray(attribPos)
  }

  return { createProgram, canvas, gl, setupCanvasTexture, setupArrayBuffer, setupVertexArray }
}
