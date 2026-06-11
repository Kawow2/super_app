import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  HousingProjectDetail, HousingProjectListItem, Loan, LoanDetail, LoanDto,
  Prepayment, PrepaymentMode, ProjectCost,
} from './housing.models';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class HousingService {
  private readonly http = inject(HttpClient);

  readonly projects = signal<HousingProjectListItem[]>([]);

  refresh() {
    this.http.get<HousingProjectListItem[]>(`${API}/housingprojects`)
      .subscribe((p) => this.projects.set(p));
  }

  getDetail(id: string): Observable<HousingProjectDetail> {
    return this.http.get<HousingProjectDetail>(`${API}/housingprojects/${id}`);
  }

  createProject(dto: { name: string; notes: string | null }) {
    return this.http.post<{ id: string }>(`${API}/housingprojects`, dto);
  }

  updateProject(id: string, dto: { name: string; notes: string | null }) {
    return this.http.put(`${API}/housingprojects/${id}`, dto);
  }

  deleteProject(id: string) {
    return this.http.delete(`${API}/housingprojects/${id}`);
  }

  addCost(projectId: string, dto: { label: string; amount: number }) {
    return this.http.post<ProjectCost>(`${API}/housingprojects/${projectId}/costs`, dto);
  }

  updateCost(projectId: string, costId: string, dto: { label: string; amount: number }) {
    return this.http.put<ProjectCost>(`${API}/housingprojects/${projectId}/costs/${costId}`, dto);
  }

  deleteCost(projectId: string, costId: string) {
    return this.http.delete(`${API}/housingprojects/${projectId}/costs/${costId}`);
  }

  getLoan(id: string): Observable<LoanDetail> {
    return this.http.get<LoanDetail>(`${API}/loans/${id}`);
  }

  createLoan(dto: LoanDto) {
    return this.http.post<Loan>(`${API}/loans`, dto);
  }

  updateLoan(id: string, dto: LoanDto) {
    return this.http.put<Loan>(`${API}/loans/${id}`, dto);
  }

  deleteLoan(id: string) {
    return this.http.delete(`${API}/loans/${id}`);
  }

  duplicateLoan(id: string, name: string) {
    return this.http.post<Loan>(`${API}/loans/${id}/duplicate`, { name });
  }

  addPrepayment(loanId: string, dto: { date: string; amount: number; mode: PrepaymentMode }) {
    return this.http.post(`${API}/loans/${loanId}/prepayments`, dto);
  }

  updatePrepayment(loanId: string, prepayment: Prepayment) {
    return this.http.put(`${API}/loans/${loanId}/prepayments/${prepayment.id}`, {
      date: prepayment.date, amount: prepayment.amount, mode: prepayment.mode,
    });
  }

  deletePrepayment(loanId: string, prepaymentId: string) {
    return this.http.delete(`${API}/loans/${loanId}/prepayments/${prepaymentId}`);
  }
}
