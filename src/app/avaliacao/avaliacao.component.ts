import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http'; // ADICIONADO: Importação para comunicação com o Java
import { ClinicaService } from '../services/clinica.service';

@Component({
  selector: 'app-avaliacao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './avaliacao.component.html',
  styleUrl: './avaliacao.component.scss'
})
export class AvaliacaoComponent implements OnInit {

  listaPacientesAtivos: any[] = [];

  // Dados do Paciente e Testes
  dados: any = {
    pacienteId: '',
    data: new Date().toISOString().split('T')[0],
    // Dinamometria
    extDir: 0, extEsq: 0,
    flexDir: 0, flexEsq: 0,
    // Hop Tests
    singleDir: 0, singleEsq: 0,
    tripleDir: 0, tripleEsq: 0,
    // Psicológico
    medoMovimento: 0
  };

  // Injetando o HttpClient no constructor
  constructor(
    private clinicaService: ClinicaService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.carregarPacientesAtivos();
  }

  carregarPacientesAtivos() {
    this.clinicaService.listarPacientes().subscribe({
      next: (res: any[]) => {
        this.listaPacientesAtivos = res.filter(p => p.pagoEsteMes || p.pago_este_mes == 1);
      },
      error: (err) => console.error('Erro ao carregar pacientes para avaliação', err)
    });
  }

  calcLSI(val1: number, val2: number): number {
    if (!val1 || !val2) return 0;
    return (Math.min(val1, val2) / Math.max(val1, val2)) * 100;
  }

  getCorStatus(valor: number): string {
    if (valor >= 90) return '#2e7d32';
    if (valor >= 80) return '#f9a825';
    return '#c62828';
  }

  // ATUALIZADO: Agora envia os dados de verdade para o Java
  salvarAvaliacao() {
    const paciente = this.listaPacientesAtivos.find(p => p.id == this.dados.pacienteId);

    if (!paciente) {
      alert('Selecione um paciente antes de salvar!');
      return;
    }

    // Montando o objeto para o Java (combinando com sua classe Avaliacao.java)
    const payload = {
      paciente: { id: paciente.id }, // Envia o ID para o @ManyToOne do Java
      dataAvaliacao: this.dados.data,
      extDir: this.dados.extDir,
      extEsq: this.dados.extEsq,
      flexDir: this.dados.flexDir,
      flexEsq: this.dados.flexEsq,
      singleDir: this.dados.singleDir,
      singleEsq: this.dados.singleEsq,
      tripleDir: this.dados.tripleDir,
      tripleEsq: this.dados.tripleEsq,
      medoMovimento: this.dados.medoMovimento
    };

    // Chamada HTTP real
    this.http.post('http://localhost:8080/api/avaliacoes', payload).subscribe({
      next: (res) => {
        console.log('Gravado com sucesso:', res);
        alert('Avaliação de ' + paciente.nome + ' gravada com SUCESSO no banco de dados!');
      },
      error: (err) => {
        console.error('Erro ao salvar no banco:', err);
        alert('Erro ao salvar: Verifique se o servidor Java está rodando e se a tabela existe.');
      }
    });
  }

  gerarRelatorio() {
    const p = this.listaPacientesAtivos.find(x => x.id == this.dados.pacienteId);

    if (!p) {
      alert("Por favor, selecione um paciente para gerar o relatório.");
      return;
    }

    const lsiExt = this.calcLSI(this.dados.extDir, this.dados.extEsq).toFixed(1);
    const lsiFlex = this.calcLSI(this.dados.flexDir, this.dados.flexEsq).toFixed(1);
    const lsiSingle = this.calcLSI(this.dados.singleDir, this.dados.singleEsq).toFixed(1);

    const resumo = `
==========================================
    RELATÓRIO DE PERFORMANCE RTS
==========================================
Paciente: ${p.nome}
Lesão: ${p.condicao}
Data da Avaliação: ${new Date(this.dados.data).toLocaleDateString('pt-BR')}

RESULTADOS DE SIMETRIA (LSI):
- Extensora: ${lsiExt}%
- Flexora: ${lsiFlex}%
- Single Hop: ${lsiSingle}%

PERCEPÇÃO PSICOLÓGICA:
- Nível de Medo: ${this.dados.medoMovimento}/10

PARECER TÉCNICO:
${parseFloat(lsiExt) >= 90 ? 'APROVADO PARA RETORNO AO ESPORTE' : 'MANTER PROGRAMA DE REABILITAÇÃO'}
==========================================
    `;

    const blob = new Blob([resumo], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_${p.nome.replace(' ', '_')}.txt`;
    link.click();

    alert('Relatório gerado com sucesso!');
  }
}
