import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicaService } from '../services/clinica.service';

@Component({
  selector: 'app-financeiro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './financeiro.component.html',
  styleUrls: ['./financeiro.component.scss']
})
export class FinanceiroComponent implements OnInit, OnChanges {

  // Recebe pacientes do componente pai (Dashboard)
  @Input() listaPacientes: any[] = [];

  constructor(private clinicaService: ClinicaService) {}

  configFinanceira = {
    mensalPreOp: 800,
    mensalPosOp: 1200
  };

  faturamentoPre = 0;
  faturamentoPos = 0;
  faturamentoTotal = 0;
  faturamentoRealizado = 0;

  ngOnInit() {
    this.atualizarFaturamento();
  }

  // ESSENCIAL: Atualiza os dados quando a lista chega do banco
  ngOnChanges(changes: SimpleChanges) {
    if (changes['listaPacientes']) {
      this.atualizarFaturamento();
    }
  }

  atualizarFaturamento() {
    if (!this.listaPacientes) return;

    // Filtra e calcula faturamento previsto
    this.faturamentoPre = this.listaPacientes
      .filter(p => p.plano === 'mensalPreOp')
      .length * this.configFinanceira.mensalPreOp;

    this.faturamentoPos = this.listaPacientes
      .filter(p => p.plano === 'mensalPosOp')
      .length * this.configFinanceira.mensalPosOp;

    this.faturamentoTotal = this.faturamentoPre + this.faturamentoPos;

    // Calcula quanto já foi pago de fato
    this.faturamentoRealizado = this.listaPacientes
      .filter(p => p.pagoEsteMes || p.pago_este_mes === true)
      .reduce((total, p) =>
        total + (p.plano === 'mensalPreOp' ? this.configFinanceira.mensalPreOp : this.configFinanceira.mensalPosOp),
      0);
  }

  alternarPagamento(paciente: any) {
    // Inverte o status de pagamento (suporta os dois nomes de variável que você usou)
    const novoStatus = !(paciente.pagoEsteMes || paciente.pago_este_mes);
    paciente.pagoEsteMes = novoStatus;
    paciente.pago_este_mes = novoStatus;

    const fd = new FormData();
    fd.append('paciente', new Blob([JSON.stringify(paciente)], { type: 'application/json' }));

    this.clinicaService.salvarPaciente(fd).subscribe({
      next: () => this.atualizarFaturamento(),
      error: () => alert('Erro ao salvar pagamento.')
    });
  }
}
