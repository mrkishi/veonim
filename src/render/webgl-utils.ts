export const WebGL2 = () => {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') as WebGLRenderingContext

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

  return { createProgram }
}
