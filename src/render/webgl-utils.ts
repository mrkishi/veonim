export const WebGL2 = () => {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') as WebGLRenderingContext

  const createShader = (type: number, source: string) => {
    const shaderSource = '#version 300 es\n' + source
    const shader = gl.createShader(type)

    gl.shaderSource(shader, shaderSource)
    gl.compileShader(shader)

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    if (success) return shader

    console.log(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
  }

  const createVertexShader = (source: string) => createShader(gl.VERTEX_SHADER, source)
  const createFragmentShader = (source: string) => createShader(gl.FRAGMENT_SHADER, source)

  const createProgram = (vertexShader: WebGLShader, fragmentShader: WebGLShader) => {
    const program = gl.createProgram()

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    const success = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (success) return program

    console.log(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
  }

  return { createVertexShader, createFragmentShader, createProgram, canvas, gl }
}
