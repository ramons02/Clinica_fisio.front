import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // Para mudar de tela

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginData = {
    username: '',
    senha: ''
  };

  constructor(private router: Router) {} // Injetando o "navegador"

  fazerLogin() {
    if (this.loginData.username === 'admin' && this.loginData.senha === '123') {
      // Agora, em vez de só alerta, ele navega para o dashboard!
      this.router.navigate(['/dashboard']);
    } else {
      alert('Usuário ou senha incorretos.');
    }
  }
}
