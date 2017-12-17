import { onDiagnostics } from '../langserv/adapter'

onDiagnostics(diagnostics => {
  console.log('DIAGS!!')
  console.log(diagnostics)
})
