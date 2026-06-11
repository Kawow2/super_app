// Modèles de l'app Immobilier (miroirs des DTOs du backend).

export type InsuranceMode = 0 | 1 | 2;        // None | AnnualPercent | FixedMonthly
export type PrepaymentMode = 0 | 1;           // ReduceDuration | ReducePayment

export interface HousingProjectListItem {
  id: string;
  name: string;
  notes: string | null;
  loanCount: number;
  totalBorrowed: number;
  monthlyPayment: number;
  finalPrice: number;
}

export interface ProjectCost {
  id: string;
  projectId: string;
  label: string;
  amount: number;
}

export interface Loan {
  id: string;
  projectId: string;
  name: string;
  principal: number;
  annualRate: number;
  durationMonths: number;
  startDate: string;                 // yyyy-MM-dd
  insuranceMode: InsuranceMode;
  insuranceAnnualRate: number;
  insuranceMonthlyAmount: number;
  fees: number;
  isScenario: boolean;
  baseLoanId: string | null;
}

export interface LoanSummary {
  monthlyPayment: number;
  monthlyInsurance: number;
  monthlyTotal: number;
  currentMonthlyTotal: number;
  totalInterest: number;
  totalInsurance: number;
  totalCost: number;
  totalRepaid: number;
  remainingBalance: number;
  remainingInterest: number;
  paymentCount: number;
  endDate: string;
  interestSaved: number;
}

export interface LoanWithSummary {
  loan: Loan;
  summary: LoanSummary;
}

export interface ScheduleEntry {
  paymentNumber: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  insurance: number;
  prepaidAmount: number;
  remainingBalance: number;
}

export interface Prepayment {
  id: string;
  loanId: string;
  date: string;
  amount: number;
  mode: PrepaymentMode;
}

export interface LoanDetail {
  loan: Loan;
  summary: LoanSummary;
  schedule: ScheduleEntry[];
  prepayments: Prepayment[];
}

export interface TimelinePoint {
  month: string;                     // yyyy-MM
  payment: number;
  insurance: number;
  total: number;
}

export interface HousingProjectDetail {
  id: string;
  name: string;
  notes: string | null;
  costs: ProjectCost[];
  loans: LoanWithSummary[];
  totalBorrowed: number;
  totalInterest: number;
  totalInsurance: number;
  totalFees: number;
  totalCosts: number;
  monthlyPayment: number;
  finalPrice: number;
  timeline: TimelinePoint[];
}

export interface LoanDto {
  projectId: string;
  name: string;
  principal: number;
  annualRate: number;
  durationMonths: number;
  startDate: string;
  insuranceMode: InsuranceMode;
  insuranceAnnualRate: number;
  insuranceMonthlyAmount: number;
  fees: number;
}
