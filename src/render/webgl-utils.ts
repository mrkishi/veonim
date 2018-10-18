import { type as getTypeOf } from '../support/utils'
// understanding webgl state
// https://stackoverflow.com/a/28641368
// https://stackoverflow.com/a/39972830
// https://stackoverflow.com/a/27164577

interface VertexArrayPointer {
  size: number
  type?: number
  normalize?: boolean
  stride?: number
  offset?: number
  divisor?: number
}

interface AttribPointer extends VertexArrayPointer {
  pointer: number
}

export enum VarKind {
  Attribute,
  Uniform,
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

  const createProgramWithShaders = (vertexShader: string, fragmentShader: string) => {
    const program = gl.createProgram()
    if (!program) return console.error('failed to create gl program. oops.')

    const vshader = createShader(gl.VERTEX_SHADER, vertexShader)
    const fshader = createShader(gl.FRAGMENT_SHADER, fragmentShader)
    if (!vshader || !fshader) return console.error('failed to create shaders - cant create program. sorry bout that')

    gl.attachShader(program, vshader)
    gl.attachShader(program, fshader)
    gl.linkProgram(program)

    const success = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (success) return program

    console.error(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
  }

  type VK = { [index: string]: VarKind }

  const setupProgram = <T extends VK>(incomingVars: T) => {
    let vertexShader: string
    let fragmentShader: string
    let program: WebGLProgram
    const varLocations = new Map<string, any>()
    type VarGet = { [Key in keyof T]: number }

    const varToString: VarGet = new Proxy(Object.create(null), {
      get: (_: any, key: string) => key,
    })

    const vars: VarGet = new Proxy(Object.create(null), {
      get: (_, key: string) => varLocations.get(key)
    })

    const setVertexShader = (fn: (incomingVars: VarGet) => string) => {
      vertexShader = fn(varToString)
    }

    const setFragmentShader = (fn: (incomingVars: VarGet) => string) => {
      fragmentShader = fn(varToString)
    }

    const create = () => {
      const res = createProgramWithShaders(vertexShader, fragmentShader)
      if (!res) throw new Error('catastrophic failure of the third kind to create webgl program')
      program = res

      Object
        .entries(incomingVars)
        .forEach(([ key, kind ]) => {
          const location = kind === VarKind.Uniform
            ? gl.getUniformLocation(program, key)
            : gl.getAttribLocation(program, key)

          varLocations.set(key, location)
        })
    }

    const use = () => gl.useProgram(program)

    return { create, vars, use, setVertexShader, setFragmentShader }
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

  // TODO: static_draw vs dynamic_draw vs stream_draw? what is most
  // appropriate for reusing arrays?
  const setupArrayBuffer = (data: any, drawKind = gl.STATIC_DRAW) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, data, drawKind)
  }

  const createVertexArray = () => {
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    return vao
  }

  const setupVertexArray = ({
    size,
    type,
    pointer,
    normalize = false,
    stride = 0,
    offset = 0,
    divisor = 0,
  }: AttribPointer) => {
    gl.enableVertexAttribArray(pointer)
    if (!type) throw new Error(`need vertex array type. we try to guess the type based on the bufferData type, but this logic is not very smart.`)
    gl.vertexAttribPointer(pointer, size, type, normalize, stride, offset)
    if (divisor > 0) gl.vertexAttribDivisor(pointer, divisor)
  }

  const guessDataType = (data: any, type: number): number => {
    if (type) return type

    const dataType = getTypeOf(data).toLowerCase()
    if (dataType.startsWith('float')) return gl.FLOAT
    if (dataType.startsWith('uint8')) return gl.BYTE
    if (dataType.startsWith('uint16')) return gl.SHORT
    return type
  }

  type DrawKind = typeof gl.STATIC_DRAW
  type AD1 = (data: any, pointers: AttribPointer, drawKind?: DrawKind) => void
  type AD2 = (data: any, pointers: AttribPointer[], drawKind?: DrawKind) => void
  type AddData = AD1 & AD2

  const addData: AddData = (data: any, pointers: any, drawKind: any) => {
    setupArrayBuffer(data, drawKind)
    const isList = (pointers.length)
    const type = guessDataType(data, pointers.type)

    if (!isList) return setupVertexArray({ type, ...pointers })
    pointers.forEach((pointer: any) => setupVertexArray({ type, ...pointer }))
  }

  return { setupProgram, canvas, gl, addData, setupCanvasTexture, resize, createVertexArray }
}
