import { NgModule } from '@angular/core';
import { NgStyle } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialExampleModule } from '../material.module';
import { TeamGenerator, HelpDialog, LoadExampleDialog } from './team-generator';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';

@NgModule({
  declarations: [TeamGenerator, LoadExampleDialog, HelpDialog],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    NgStyle,
    FormsModule,
    HttpClientModule,
    MatNativeDateModule,
    MaterialExampleModule,
    ReactiveFormsModule,
    AppRoutingModule,
  ],
  bootstrap: [TeamGenerator],
})
export class AppModule {}
