import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Meal, MealDto, Planning, PlanningSlot, ShoppingList, MealTime } from './recettes.models';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class RecettesService {
  private readonly http = inject(HttpClient);

  readonly meals = signal<Meal[]>([]);

  refreshMeals() {
    this.http.get<Meal[]>(`${API}/meals`).subscribe((m) => this.meals.set(m));
  }

  getMeal(id: string): Observable<Meal> {
    return this.http.get<Meal>(`${API}/meals/${id}`);
  }

  createMeal(dto: MealDto) {
    return this.http.post<Meal>(`${API}/meals`, dto);
  }

  updateMeal(id: string, dto: MealDto) {
    return this.http.put<Meal>(`${API}/meals/${id}`, dto);
  }

  deleteMeal(id: string) {
    return this.http.delete(`${API}/meals/${id}`);
  }

  ingredientNames(): Observable<string[]> {
    return this.http.get<string[]>(`${API}/ingredients`);
  }

  getPlanning(weekStart: string): Observable<Planning> {
    return this.http.get<Planning>(`${API}/plannings`, { params: { weekStart } });
  }

  generate(weekStart: string): Observable<Planning> {
    return this.http.post<Planning>(`${API}/plannings/generate`, null, { params: { weekStart } });
  }

  getShoppingList(weekStart: string): Observable<ShoppingList> {
    return this.http.get<ShoppingList>(`${API}/plannings/shopping-list`, { params: { weekStart } });
  }

  setSlot(planningId: string, dto: { dayOfWeek: number; mealTime: MealTime; mealId: string }) {
    return this.http.post<PlanningSlot>(`${API}/plannings/${planningId}/slots`, dto);
  }

  toggleLock(planningId: string, slotId: string) {
    return this.http.post<PlanningSlot>(`${API}/plannings/${planningId}/slots/${slotId}/lock`, null);
  }

  clearSlot(planningId: string, slotId: string) {
    return this.http.delete(`${API}/plannings/${planningId}/slots/${slotId}`);
  }
}
