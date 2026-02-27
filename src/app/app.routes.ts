import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';

export const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  // Deixamos o login como padrão por enquanto no AppComponent,
  // mas depois moveremos ele para um componente próprio.
];
