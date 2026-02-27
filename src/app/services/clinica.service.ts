import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClinicaService {
  // Agora apontando corretamente para o Spring Boot no IntelliJ
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) { }

 // No seu clinica.service.ts
 salvarPaciente(formData: FormData): Observable<any> {
   // Verifique se a URL termina exatamente em /api/pacientes
   return this.http.post('http://localhost:8080/api/pacientes', formData);
 }
  listarPacientes(): Observable<any[]> {
  return this.http.get<any[]>('http://localhost:8080/api/pacientes');
}

  excluirPaciente(id: number): Observable<any> {
    // No Spring Boot geralmente usamos DELETE, mas vamos manter POST se sua Controller estiver assim
    return this.http.delete(`${this.apiUrl}/pacientes/${id}`);
  }

  listarAgenda(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/agenda`);
  }

  salvarAgendamento(dados: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/agenda`, dados);
  }
salvarEvolucao(dados: any): Observable<any> {
  return this.http.post('http://localhost:8080/api/evolucoes', dados);
}

listarEvolucoes(pacienteId: number): Observable<any[]> {
  return this.http.get<any[]>(`http://localhost:8080/api/evolucoes/${pacienteId}`);
}

  salvarComExame(dadosPaciente: any, arquivo: File) {
  const fd = new FormData();

  // Transforma todos os dados do paciente em um único texto JSON
  // Isso evita o erro de "muitos campos" no servidor
  fd.append('paciente', JSON.stringify(dadosPaciente));

  // Adiciona o arquivo apenas se ele existir
  if (arquivo) {
    fd.append('exame', arquivo);
  }

  return this.http.post('http://localhost:8080/api/pacientes/com-exame', fd);
}
// Dentro do seu ClinicaService
diasParaVencer(dataInicio: string): number {
  if (!dataInicio) return 0;
  const inicio = new Date(dataInicio);
  const hoje = new Date();
  const diffTime = hoje.getTime() - inicio.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return 30 - (diffDays % 30);
}

verificarRenovacaoProxima(dataInicio: string): boolean {
  const dias = this.diasParaVencer(dataInicio);
  return dias <= 5 && dias >= 0;
}
}
