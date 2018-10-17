// understanding webgl state
// https://stackoverflow.com/a/28641368
// https://stackoverflow.com/a/39972830
// https://stackoverflow.com/a/27164577

interface VertexArrayPointer {
  size: number
  type: number
  normalize?: boolean
  stride?: number
  offset?: number
}

export const WebGL2 = () => {
  const canvas = document.createElement('canvas')
  // TODO: perf improvement with no alpha? can we blend another canvas on top of this one then?
  // const gl = canvas.getContext('webgl2', { alpha: false }) as WebGL2RenderingContext
  const gl = canvas.getContext('webgl2') as WebGL2RenderingContext

  const resize = (width: number, height: number) => {
    const w = Math.round(width * window.devicePixelRatio)
    const h = Math.round(height * window.devicePixelRatio)

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
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
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
  }

  const setupArrayBuffer = (data: Float32Array) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    // TODO: static_draw vs dynamic_draw vs stream_draw? what is most
    // appropriate for reusing arrays?
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
  }

  const createVertexArray = () => {
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    return vao
  }

  const setupVertexArray = (attribPos: number, options: VertexArrayPointer) => {
    const { size, type, normalize = false, stride = 0, offset = 0 } = options
    gl.enableVertexAttribArray(attribPos)
    gl.vertexAttribPointer(attribPos, size, type, normalize, stride, offset)
  }

  return { createProgram, canvas, gl, setupCanvasTexture, setupArrayBuffer, setupVertexArray, resize, createVertexArray }
}
