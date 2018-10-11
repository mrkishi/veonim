// understanding webgl state
// https://stackoverflow.com/a/28641368
// https://stackoverflow.com/a/39972830
// https://stackoverflow.com/a/27164577

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

  return { createProgram, canvas, gl }
}
