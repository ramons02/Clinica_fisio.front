import { Component, OnInit, Output, EventEmitter } from '@angular/core'; // Adicionado Output e EventEmitter aqui
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ClinicaService } from '../services/clinica.service';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss'
})
export class AgendaComponent implements OnInit {

  constructor(
    private http: HttpClient,
    private clinicaService: ClinicaService
  ) {}

  /* =====================================================
     CONTROLE
     ===================================================== */

  telaAtual: string = 'agenda';

  /* =====================================================
     DADOS
     ===================================================== */

  // O @Output deve ficar dentro da classe e com os imports corretos
  @Output() aoClicarNoAgendamento = new EventEmitter<any>();

  agenda: any[] = [];
  pacientes: any[] = [];
  listaPacientes: any[] = [];
  alertasVencimento: any[] = [];

  exibindoResumoAgenda = false;
  pacienteResumo: any = null;

  dataSelecionada: string =
    new Date().toISOString().split('T')[0];

  novoAgendamento: any = {
    pacienteId: '',
    data: new Date().toISOString().split('T')[0],
    horario: '',
    tipo: 'sessao',
    observacao: ''
  };

  /* =====================================================
     INIT
     ===================================================== */

  ngOnInit(): void {
    this.carregarAgenda();
    this.carregarPacientes();
  }

  /* =====================================================
     PACIENTES
     ===================================================== */

  carregarPacientes() {
    this.clinicaService.listarPacientes().subscribe({
      next: (dados) => {
        this.pacientes = dados;
        this.listaPacientes = dados;
        this.verificarAlertas();
      },
      error: (err) =>
        console.error('Erro ao carregar pacientes', err)
    });
  }

  /* =====================================================
     AGENDA
     ===================================================== */

  carregarAgenda() {
    this.clinicaService.listarAgenda().subscribe({
      next: (dados) => this.agenda = dados,
      error: (err) =>
        console.error('Erro ao buscar agenda:', err)
    });
  }

  agendarSessao() {
    const paciente = this.pacientes.find(
      p => p.id == this.novoAgendamento.pacienteId
    );

    if (!paciente) {
      alert('Selecione um paciente');
      return;
    }

    const objetoParaSalvar = {
      title: paciente.nome,
      lesao: paciente.condicao,
      start:
        this.novoAgendamento.data +
        'T' +
        this.novoAgendamento.horario
    };

    this.http.post(
      'http://localhost:8080/api/agenda',
      objetoParaSalvar
    ).subscribe({
      next: () => {
        alert('Sessão agendada!');
        this.carregarAgenda();
      },
      error: () => alert('Erro ao agendar')
    });
  }

  desmarcarSessao(id: number) {
    if (!confirm('Deseja realmente desmarcar?')) return;

    this.http.delete(
      `http://localhost:8080/api/agenda/${id}`
    ).subscribe({
      next: () => this.carregarAgenda(),
      error: () => alert('Erro ao excluir')
    });
  }

  /* =====================================================
     ALERTAS FINANCEIROS
     ===================================================== */

  verificarAlertas() {
    this.alertasVencimento = this.listaPacientes.filter(p => {
      if (!p.dataInicioPlano) return false;

      const dias =
        this.calcularDiasRestantes(p.dataInicioPlano);

      return (dias <= 5) &&
        (!p.pagoEsteMes && !p.pago_este_mes);
    });
  }

  calcularDiasRestantes(dataInicio: string): number {
    const inicio = new Date(dataInicio);
    const hoje = new Date();

    const vencimento = new Date(
      inicio.getTime() + (30 * 24 * 60 * 60 * 1000)
    );

    const diff = vencimento.getTime() - hoje.getTime();

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  obterStatusMensalidade(paciente: any) {
    if (!paciente.dataInicioPlano)
      return { texto: 'Sem data', cor: '#70757a' };

    const dias =
      this.calcularDiasRestantes(paciente.dataInicioPlano);

    if (paciente.pagoEsteMes || paciente.pago_este_mes)
      return { texto: 'Pago', cor: '#34a853' };

    if (dias < 0)
      return { texto: 'Atrasado', cor: '#d93025' };

    if (dias <= 5)
      return { texto: `Vence em ${dias}d`, cor: '#f4b400' };

    return { texto: 'Pendente', cor: '#1a73e8' };
  }

  renovarMes(paciente: any) {
    paciente.dataInicioPlano =
      new Date().toISOString().split('T')[0];

    paciente.pagoEsteMes = true;

    const fd = new FormData();
    fd.append(
      'paciente',
      new Blob([JSON.stringify(paciente)], {
        type: 'application/json'
      })
    );

    this.clinicaService.salvarPaciente(fd).subscribe({
      next: () => {
        alert('Plano renovado!');
        this.carregarPacientes();
      }
    });
  }

  /* =====================================================
     VISUAL AGENDA
     ===================================================== */

  sessaoValida(agendamento: any): boolean {
    if (!agendamento.start) return false;
    const dataEvento = agendamento.start.split('T')[0];
    return dataEvento === this.dataSelecionada;
  }

  calcularPosicao(horarioISO: string): string {
    const horaInicial = 8;
    const alturaPorHora = 80;

    const data = new Date(horarioISO);

    const topo =
      ((data.getHours() - horaInicial) * alturaPorHora) +
      (data.getMinutes() / 60 * alturaPorHora);

    return `${topo}px`;
  }

  fecharResumoAgenda() {
    this.exibindoResumoAgenda = false;
    this.pacienteResumo = null;
  }

  // Essa função agora envia o agendamento para o App.ts através do EventEmitter
  abrirResumoAgenda(a: any) {
    this.aoClicarNoAgendamento.emit(a);
  }
}
