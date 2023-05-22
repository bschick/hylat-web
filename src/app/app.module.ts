import { NgModule } from '@angular/core';
import { NgStyle } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialExampleModule } from '../material.module';
import {
  ButtonOverviewExample,
  HelpDialog,
  LoadExampleDialog,
} from './button-overview-example';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClientModule } from '@angular/common/http';
import { AngularResizeEventModule } from 'angular-resize-event';

@NgModule({
  declarations: [ButtonOverviewExample, LoadExampleDialog, HelpDialog],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    NgStyle,
    FormsModule,
    HttpClientModule,
    MatNativeDateModule,
    MaterialExampleModule,
    ReactiveFormsModule,
    AngularResizeEventModule,
  ],
  bootstrap: [ButtonOverviewExample],
})
export class AppModule {}
