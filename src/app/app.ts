import { Component, OnInit, ViewChild } from '@angular/core'; // Adicionado ViewChild
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { AvaliacaoComponent } from './avaliacao/avaliacao.component';
import { AgendaComponent } from './agenda/agenda.component';
import { PacientesComponent } from './pacientes/pacientes.component';
import { FinanceiroComponent } from './financeiro/financeiro.component';
import { ConfiguracoesComponent } from './configuracoes/configuracoes.component';
import { ClinicaService } from './services/clinica.service';
import { HttpClient } from '@angular/common/http'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, AvaliacaoComponent, AgendaComponent, PacientesComponent, FinanceiroComponent, ConfiguracoesComponent],
  providers: [DatePipe],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit {
  // Referência para o componente de pacientes para poder chamar a função de abrir ficha lá dentro
  @ViewChild(PacientesComponent) pacientesComp!: PacientesComponent;

  // --- Controle de Acesso ---
  logado: boolean = false;
  usuarioLogado: any = {
    nome: 'Dr. Ramon',
    cargo: 'MASTER'
  };

  // --- Navegação ---
  telaAtual: string = 'login';
  dataHoje: string = '';

  // --- Dados do Login ---
  loginData = { username: '', senha: '' };

  // --- Estado da Interface ---
  exibindoResumoAgenda: boolean = false;
  exibindoFicha: boolean = false;
  editandoPaciente: any = null;
  pacienteResumo: any = null;
  pacienteSelecionado: any = null;

  // --- Dados do Sistema (Listas) ---
  listaPacientes: any[] = [];
  alertasVencimento: any[] = [];

  constructor(
    public clinicaService: ClinicaService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.dataHoje = new Date().toLocaleDateString('pt-BR');
  }

  carregarDadosIniciais() {
    this.clinicaService.listarPacientes().subscribe({
      next: (dados) => {
        this.listaPacientes = dados;
        console.log('Pacientes carregados no Dashboard:', dados);
      },
      error: (err) => console.error('Erro ao carregar dashboard:', err)
    });
  }

  // --- NOVO MÉTODO: SALVAR USUÁRIO ---
  salvarNovoUsuario(novoUsuario: any) {
    console.log('Tentando cadastrar novo usuário:', novoUsuario);
    
    this.http.post('http://localhost:8080/api/usuarios/cadastrar', novoUsuario).subscribe({
      next: (res) => {
        alert('Usuário cadastrado com sucesso!');
        this.mudarTela('home'); 
      },
      error: (err) => {
        console.error('Erro ao salvar usuário no banco Java:', err);
        alert('Erro ao salvar usuário!');
      }
    });
  }

  fazerLogin() {
    const dadosParaEnvio = {
      username: this.loginData.username,
      senha: this.loginData.senha
    };

    this.http.post('http://localhost:8080/api/usuarios/login', dadosParaEnvio).subscribe({
      next: (response: any) => {
        if (response && response.token) {
          localStorage.setItem('token', response.token);
          this.logado = true;
          this.usuarioLogado = response;
          this.telaAtual = 'home';
          this.carregarDadosIniciais();
        }
      },
      error: (err) => {
        console.error('Erro no login:', err);
        alert('Erro ao tentar logar.');
      }
    });
  }

  logout() {
    this.logado = false;
    this.telaAtual = 'login';
    this.loginData = { username: '', senha: '' };
    localStorage.removeItem('token');
  }

  mudarTela(novaTela: string) {
    this.telaAtual = novaTela;
    if (novaTela === 'home') {
      this.carregarDadosIniciais();
    }
  }

  // MÉTODO ATUALIZADO: Agora ele força o componente de pacientes a abrir a ficha
  abrirFicha(paciente: any) {
    // 1. Encontra o paciente completo na lista (caso venha apenas o resumo da agenda)
    const pacienteCompleto = this.listaPacientes.find(p => p.id === paciente.id || p.nome === paciente.nome);
    
    // 2. Muda para a tela de pacientes
    this.telaAtual = 'pacientes';
    
    // 3. Aguarda o componente carregar e chama o abrirFicha dele
    setTimeout(() => {
      if (this.pacientesComp && pacienteCompleto) {
        this.pacientesComp.abrirFicha(pacienteCompleto);
      } else {
        // Fallback caso o ViewChild falhe
        this.pacienteSelecionado = pacienteCompleto;
      }
    }, 100);
  }

  verificarRenovacaoProxima(dataInicio: string): boolean {
    if (!dataInicio) return false;
    const dias = this.diasParaVencer(dataInicio);
    return dias <= 5 && dias >= 0;
  }

  diasParaVencer(dataInicio: string): number {
    if (!dataInicio) return 0;
    const inicio = new Date(dataInicio + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diffTime = hoje.getTime() - inicio.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diasPassadosNoCiclo = diffDays % 30;
    const restantes = 30 - diasPassadosNoCiclo;
    return restantes === 0 ? 30 : restantes;
  }

  contarPendentes(): number {
    if (!this.listaPacientes) return 0;
    return this.listaPacientes.filter(p =>
      p.pagoEsteMes === false && p.pago_este_mes != 1
    ).length;
  }

  contarVencimentosProximos(): number {
    if (!this.listaPacientes) return 0;
    return this.listaPacientes.filter(p => this.verificarRenovacaoProxima(p.dataInicioPlano)).length;
  }

  alternarPagamento(paciente: any) {
    const novoStatus = !(paciente.pagoEsteMes || paciente.pago_este_mes == 1);
    paciente.pagoEsteMes = novoStatus;
    paciente.pago_este_mes = novoStatus ? 1 : 0;

    if (novoStatus) {
      paciente.dataInicioPlano = new Date().toISOString().split('T')[0];
    }

    const fd = new FormData();
    fd.append('paciente', new Blob([JSON.stringify(paciente)], { type: 'application/json' }));

    this.clinicaService.salvarPaciente(fd).subscribe({
      next: () => {
        this.carregarDadosIniciais();
      },
      error: (err) => {
        console.error("Erro ao salvar pagamento", err);
      }
    });
  }

  abrirResumoAgenda(agendamento: any) {
    const pacienteCompleto = this.listaPacientes.find(p => p.nome === agendamento.title);
    this.pacienteResumo = {
      nome: agendamento.title,
      condicao: agendamento.lesao || (pacienteCompleto ? pacienteCompleto.condicao : 'Não informada'),
      horario: agendamento.start.includes('T') ? agendamento.start.split('T')[1] : agendamento.start,
      id: agendamento.pacienteId || (pacienteCompleto ? pacienteCompleto.id : null),
      telefone: pacienteCompleto ? pacienteCompleto.telefone : 'N/A'
    };
    this.exibindoResumoAgenda = true;
  }
}