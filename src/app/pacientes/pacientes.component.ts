import { Component, OnInit, Output, EventEmitter } from '@angular/core'; // Adicionado Output e EventEmitter
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicaService } from '../services/clinica.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.scss'
})
export class PacientesComponent implements OnInit {

  // NOVA SAÍDA: Avisa o app.ts para voltar para a Home
  @Output() aoSairDaFicha = new EventEmitter<void>();

  telaAtual: string = 'pacientes';
  listaPacientes: any[] = [];
  pacienteSelecionado: any = null;

  // Evoluções
  listaEvolucoes: any[] = [];
  novaEvolucao: string = '';

  // Cadastro e Upload
  arquivoSelecionado: File | null = null;
  novoPaciente: any = this.resetForm();

  constructor(
    private clinicaService: ClinicaService,
    private http: HttpClient 
  ) {}

  ngOnInit() {
    this.carregarPacientes();
  }

  // NOVA FUNÇÃO: Fecha a ficha, limpa o estado e manda o App ir para a Home
  fecharFichaEVoltar() {
    this.pacienteSelecionado = null; // Limpa para não aparecer o cadastro ao voltar
    this.aoSairDaFicha.emit();       // Dispara o evento para o app.ts
  }

  carregarPacientes() {
    this.clinicaService.listarPacientes().subscribe({
      next: (dados) => this.listaPacientes = dados,
      error: (err) => console.error('Erro ao listar:', err)
    });
  }

  // =============================
  // NOVA FUNÇÃO: ALTERNAR PAGAMENTO (PAGO/PENDENTE)
  // =============================
  alternarPagamento(paciente: any) {
    paciente.pagoEsteMes = !paciente.pagoEsteMes;

    const fd = new FormData();
    fd.append('paciente', new Blob([JSON.stringify(paciente)], { type: 'application/json' }));

    this.clinicaService.salvarPaciente(fd).subscribe({
      next: () => {
        console.log('Status de pagamento updated!');
        this.carregarPacientes();
      },
      error: (err) => {
        console.error('Erro ao atualizar pagamento:', err);
        paciente.pagoEsteMes = !paciente.pagoEsteMes;
        alert('Erro ao salvar status de pagamento no banco.');
      }
    });
  }

  // =============================
  // LÓGICA DA FICHA E EVOLUÇÃO
  // =============================
  abrirFicha(paciente: any) {
    this.pacienteSelecionado = { ...paciente };
    this.listaEvolucoes = [];

    this.clinicaService.listarEvolucoes(paciente.id).subscribe({
      next: (dados) => this.listaEvolucoes = dados,
      error: (err) => console.error('Erro ao buscar evoluções:', err)
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  adicionarEvolucao() {
    if (!this.novaEvolucao.trim()) return;

    const agora = new Date().toISOString().split('.')[0];

    const dados = {
      pacienteId: this.pacienteSelecionado.id,
      texto: this.novaEvolucao,
      dataRegistro: agora
    };

    this.clinicaService.salvarEvolucao(dados).subscribe({
      next: () => {
        this.novaEvolucao = '';
        this.abrirFicha(this.pacienteSelecionado);
      },
      error: (err) => {
        console.error('Erro retornado do Java:', err);
        alert('Erro ao salvar.');
      }
    });
  }

  // =============================
  // CADASTRO / ATUALIZAÇÃO
  // =============================
  cadastrarPaciente() {
    const dadosParaSalvar = this.pacienteSelecionado ? this.pacienteSelecionado : this.novoPaciente;

    if (!dadosParaSalvar.nome) return alert('Nome obrigatório');

    const fd = new FormData();
    fd.append('paciente', new Blob([JSON.stringify(dadosParaSalvar)], { type: 'application/json' }));

    if (this.arquivoSelecionado) {
      fd.append('exame', this.arquivoSelecionado);
    }

    this.clinicaService.salvarPaciente(fd).subscribe({
      next: () => {
        alert(this.pacienteSelecionado ? 'Prontuário Atualizado!' : 'Paciente Cadastrado!');
        this.arquivoSelecionado = null;
        if (!this.pacienteSelecionado) {
          this.novoPaciente = this.resetForm();
        } else {
          this.pacienteSelecionado = null;
        }
        this.carregarPacientes();
      },
      error: (err) => console.error('Erro ao salvar:', err)
    });
  }

  excluirPaciente(id: number): void {
    if (confirm('Tem certeza que deseja apagar este paciente permanentemente?')) {
      this.http.delete(`http://localhost:8080/api/pacientes/${id}`).subscribe({
        next: () => {
          alert('Paciente removido com sucesso!');
          this.carregarPacientes();
        },
        error: (err: any) => {
          console.error('Erro ao excluir:', err);
          alert('Não foi possível excluir o paciente.');
        }
      });
    }
  }

  // =============================
  // FORMATADORES E CÁLCULOS
  // =============================

  calcularSemanas(dataInicio: string): number {
    if (!dataInicio) return 0;
    const inicio = new Date(dataInicio);
    const hoje = new Date();
    const diferencaMs = hoje.getTime() - inicio.getTime();
    const semanas = Math.floor(diferencaMs / (1000 * 60 * 60 * 24 * 7));
    return semanas >= 0 ? semanas : 0;
  }

  resetForm() {
    return {
      nome: '', cpf: '', telefone: '', peso: '', altura: '',
      condicao: '', plano: 'mensalPosOp',
      dataInicioPlano: new Date().toISOString().split('T')[0],
      historicoLesao: '', objetivos: '', endereco: '', pagoEsteMes: false
    };
  }

  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.arquivoSelecionado = event.target.files[0];
    }
  }

  formatarCPF() {
    let alvo = this.pacienteSelecionado ? this.pacienteSelecionado : this.novoPaciente;
    let v = alvo.cpf.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    alvo.cpf = v;
  }

  formatarTelefone() {
    let alvo = this.pacienteSelecionado ? this.pacienteSelecionado : this.novoPaciente;
    let v = alvo.telefone.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 10)
      v = v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    else if (v.length > 2)
      v = v.replace(/^(\d{2})(\d)/, "($1) $2");
    alvo.telefone = v;
  }

  verificarCobranca(dataInicio: string): boolean {
    if (!dataInicio) return false;
    const inicio = new Date(dataInicio);
    const hoje = new Date();
    const diffTime = hoje.getTime() - inicio.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diaDoCiclo = diffDays % 30;
    return diaDoCiclo >= 25;
  }
}