import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracoes.component.html',
  styleUrl: './configuracoes.component.scss'
})
export class ConfiguracoesComponent implements OnInit {

  @Input() telaAtual: string = 'configuracoes';
  @Input() usuarioLogado: any = { nome: '', cargo: '' };

  @Output() mudarTela = new EventEmitter<string>();
  // --- ADICIONADO: Output para usar a função do App pai se necessário ---
  @Output() salvarUsuario = new EventEmitter<any>();

  dataHoje: string = '';
  listaUsuarios: any[] = [];

  novoUsuario = {
    nome: '',
    username: '',
    senha: '',
    cargo: 'FISIOTERAPEUTA'
  };

  configFinanceira = {
    mensalPreOp: 800,
    mensalPosOp: 1200
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.dataHoje = new Date().toLocaleDateString();
    this.carregarUsuarios();
  }

carregarUsuarios(): void {
  console.log('Chamando o Java para buscar usuários...');
  
  this.http.get<any[]>('http://localhost:8080/api/usuarios').subscribe({
    next: (dados) => {
      console.log('O Java respondeu com estes dados:', dados);
      this.listaUsuarios = dados;
      
      // Se a lista vier vazia, o problema é no Banco!
      if (dados.length === 0) {
        console.warn('O banco de dados retornou zero usuários!');
      }
    },
    error: (err) => {
      console.error('ERRO AO CONECTAR NO JAVA:', err);
      alert('Não consegui conectar no servidor Java para buscar a lista.');
    }
  });
}

  cadastrarUsuario(): void {
    if (!this.novoUsuario.username || !this.novoUsuario.senha) {
      alert('Por favor, preencha Usuário e Senha.');
      return;
    }

    // Usamos { responseType: 'text' } porque o seu Java está devolvendo uma frase 
    // e não um objeto JSON. Isso evita que o Angular caia no 'error'.
    this.http.post('http://localhost:8080/api/usuarios/cadastrar', this.novoUsuario, { responseType: 'text' }).subscribe({
      next: (res) => {
        console.log('Resposta do servidor:', res);
        alert('Usuário cadastrado com sucesso!');
        this.novoUsuario = { nome: '', username: '', senha: '', cargo: 'FISIOTERAPEUTA' };
        this.carregarUsuarios(); // Atualiza a lista na tela
      },
      error: (err) => {
        console.error('Erro ao cadastrar:', err);
        alert('Erro ao salvar usuário. Verifique se o login já existe.');
      }
    });
}
  removerUsuario(id: any): void {
    if (confirm('Deseja realmente excluir este acesso?')) {
      this.http.delete(`http://localhost:8080/api/usuarios/${id}`).subscribe({
        next: () => {
          alert('Acesso removido!');
          this.carregarUsuarios();
        },
        error: (err) => alert('Erro ao excluir usuário.')
      });
    }
  }

  salvarConfiguracoes(): void {
    this.http.post('http://localhost:8080/api/configuracoes/financeiro', this.configFinanceira).subscribe({
      next: () => alert('Preços atualizados com sucesso!'),
      error: (err) => {
        console.warn('Configurações salvas localmente.');
        alert('Preços atualizados na tela! (Para gravar no banco definitivo, crie o Controller de Financeiro no Java).');
      }
    });
  }

  voltarParaHome(): void {
    this.mudarTela.emit('home');
  }
}