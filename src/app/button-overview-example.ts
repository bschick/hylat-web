import { Component, Renderer2, Inject, ViewChild, OnInit } from '@angular/core';
import {
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { TeamsService, Teams, Params } from './teams.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatRipple } from '@angular/material/core';
import { loadPyodide } from 'pyodide';
import { HttpParams } from '@angular/common/http';

export interface DialogData {
  message: string;
}
/**
 * @title Teams
 */
@Component({
  selector: 'button-overview-example',
  templateUrl: 'button-overview-example.html',
  providers: [TeamsService],
  styleUrls: ['button-overview-example.css'],
})
export class ButtonOverviewExample implements OnInit {
  private pyodide: any = undefined;
  public teamHeight: string = '200pt';
  public familyHeight: string = '200pt';
  private dirty: boolean;
  public familyText = '';
  public hylat: any = null;
  public hylatReady: Promise<void>;
  public teamsLabel = 'Teams';
  public teamText = '';
  public showProgress = false;
  public enableLocal = false;
  public errorColor = false;
  public maxTries = 1000;
  @ViewChild(MatRipple) ripple: MatRipple;

  // options
  public generations = false;
  public oktogether = false;
  public sizeorcount: number = 2;
  public uneven = false;
  public drop = false;
  public tries: number = 200;
  public json = false;
  public commas = false;
  public teamControlLabel = 'Players Per Team';
  public teamControl = 'size';
  public rounding = 'closest';
  public local = false;

  constructor(
    private r2: Renderer2,
    public dialog: MatDialog,
    private teamsService: TeamsService,
    private snackBar: MatSnackBar
  ) {
    this.dirty = false;
    this.onResetOptions();
    this.hylatReady = this.loadHylat();
  }

  ngOnInit(): void {
    var params = new HttpParams({ fromString: window.location.search });
    if (params.get('teamsize')) {
      this.sizeorcount = Math.max(2, Number(params.get('teamsize')));
      this.teamControl = 'size';
    } else if (params.get('teamcount')) {
      this.sizeorcount = Math.max(2, Number(params.get('teamcount')));
      this.teamControl = 'count';
    }
    if (['true', '1'].includes(params.get('oktogether')!)) {
      this.oktogether = true;
    }
    if (['true', '1'].includes(params.get('generations')!)) {
      this.generations = true;
    }
    if (['true', '1'].includes(params.get('uneven')!)) {
      this.uneven = true;
    } else if (['true', '1'].includes(params.get('drop')!)) {
      this.drop = true;
    }
    if (['true', '1'].includes(params.get('json')!)) {
      this.json = true;
    } else if (['true', '1'].includes(params.get('commas')!)) {
      this.commas = true;
    }
    if (params.get('people')) {
      this.familyText = decodeURIComponent(params.get('people')!);
      this.showProgress = true;
      // wait for pyodide to load or fail so we can use the local version if possible
      this.hylatReady.finally(() => {
        this.showProgress = false;
        this.getTeams();
      });
    }
  }

  onNewPage(): void {
    var url = window.location.origin;
    var params = new HttpParams();
    if (this.teamControl == 'count') {
      params = params.append('teamcount', this.sizeorcount);
    } else if (this.sizeorcount != 2) {
      params = params.append('teamsize', this.sizeorcount);
    }

    if (this.oktogether) {
      params = params.append('oktogether', this.oktogether);
    }
    if (this.generations) {
      params = params.append('generations', this.generations);
    }
    if (this.uneven) {
      params = params.append('uneven', this.uneven);
    } else if (this.drop) {
      params = params.append('drop', this.drop);
    }
    if (this.json) {
      params = params.append('json', this.json);
    } else if (this.commas) {
      params = params.append('commas', this.commas);
    }
    if (this.familyText.length > 1) {
      params = params.append('people', encodeURIComponent(this.familyText));
    }

    if (params.keys().length > 0) {
      url += `?${params.toString()}`;
    }
    window.open(url);
  }

  onResetOptions(): void {
    this.generations = false;
    this.oktogether = false;
    this.teamControl = 'size';
    this.teamControlLabel = 'Players Per Team';
    this.sizeorcount = 2;
    this.uneven = false;
    this.drop = false;
    this.json = false;
    this.commas = false;
    this.rounding = 'closest';
    if (this.enableLocal == true) {
      this.local = true;
      this.maxTries = 10000;
      this.tries = 2000;
    } else {
      this.maxTries = 1000;
      this.tries = 200;
    }
  }

  async loadHylat() {
    return loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.2/full/',
      stdLibURL:
        'https://cdn.jsdelivr.net/pyodide/v0.23.2/full/python_stdlib.zip',
    })
      .then(async (pyodide) => {
        return pyodide.loadPackage('numpy').then(
          () => {
            // ready for usage
            this.pyodide = pyodide;
          },
          (error) => {
            throw error;
          }
        );
      })
      .then(async () => {
        return this.pyodide
          ? fetch('https://teams.schicks.net/hylat.zip', { method: 'GET' })
          : undefined;
      })
      .then(async (response) => {
        if (response && response.ok) {
          console.log(`hylat download: ${response.status}`);
          return response.arrayBuffer();
        } else {
          return undefined;
        }
      })
      .then((buffer) => {
        if (buffer) {
          this.pyodide.unpackArchive(buffer, 'zip');
          this.hylat = this.pyodide.pyimport('hylat');
          if (this.hylat) {
            this.maxTries = 10000;
            this.tries = 2000;
            this.enableLocal = true;
            this.local = true;
          }
        }
      });
  }

  onDropChange(): void {
    if (this.drop) {
      this.uneven = false;
    }
  }

  onUnevenChange(): void {
    if (this.uneven) {
      this.drop = false;
    } else {
    }
  }

  onLocalChange(): void {
    if (this.local) {
      this.maxTries = 10000;
      this.tries *= 10;
    } else {
      if (this.tries >= 1000) {
        this.tries /= 10;
      } else {
        this.tries = 100;
      }
      this.maxTries = 1000;
    }
  }

  onMakeTeamsClicked(): void {
    this.getTeams();
  }

  onTeamControlChange(value: string): void {
    if (value == 'size') {
      this.teamControlLabel = 'Players Per Team';
    } else {
      this.teamControlLabel = 'Number Of Teams';
    }
  }

  toastMessage(msg: string): void {
    this.snackBar.open(msg, '', {
      duration: 2000,
    });
  }

  showFamilyHelp(): void {
    var dialogRef = this.dialog.open(HelpDialog);
  }

  onClearTeams(): void {
    this.teamText = '';
    this.teamsLabel = 'Teams';
    this.toastMessage('Teams Cleared');
  }

  getTeams(): void {
    // find a better spot for this...
    if (this.sizeorcount < 2) {
      this.sizeorcount = 2;
    }

    if (this.familyText.length < 1) {
      var dialogRef = this.dialog.open(LoadExampleDialog, {
        data: {
          message: 'People have not been entered. Load an example list?',
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result == 'Yes') {
          this.loadExample();
          this.getTeams();
        }
      });
      this.r2.selectRootElement('#familyInput').focus();
    } else {
      if (this.local && this.enableLocal) {
        this.getTeamsLocal();
      } else {
        this.getTeamsRemote();
      }
    }
  }

  showError(msg: string): void {
    this.teamText = msg;
    this.errorColor = true;
    this.teamsLabel = 'Error';
  }

  showTeams(
    teams: string,
    team_count: number,
    player_count: number,
    drop_count: number
  ): void {
    var label = `${team_count} Teams ${player_count} Players`;
    if (this.drop) {
      label += ` (${drop_count} dropped)`;
    }
    this.teamText = teams;
    this.errorColor = false;
    this.teamsLabel = label;
  }

  getTeamsRemote(): void {
    this.showProgress = true;
    var start = Date.now();
    var params: Params = {};
    this.assignParams(params);

    this.teamsService.getTeams(this.familyText, params).subscribe({
      next: (resp: Teams) => {
        var end = Date.now();
        this.showTeams(
          resp['teams'],
          resp['team_count'],
          resp['player_count'],
          resp['drop_count']
        );
        this.showProgress = false;
        console.log(`remote time ${end - start}ms. tries ${resp['tries']}`);
      },
      error: (error) => {
        var end = Date.now();
        console.log(error);
        if (error.status == 400 || error.status == 500) {
          this.showError(error.error);
          this.ripple.launch({ centered: true });
        } else {
          this.showError(
            'Connection error. Please check your internet access.'
          );
        }
        this.showProgress = false;
        console.log(`remote time ${end - start}ms.`);
      },
    });
  }

  getTeamsLocal(): void {
    this.hylatReady.then(() => {
      if (!this.hylat) {
        console.log('local version did not load, try again');
        return;
      }
      var start = Date.now();
      var params = this.hylat.default_args();
      this.assignParams(params);
      //helpful for debugging
      //      params.verbose = 1;
      var resp = this.hylat.wrapped_teams_from_str(params, this.familyText);
      var err = resp.get('error');
      if (err) {
        var end = Date.now();
        this.showError(err);
        this.ripple.launch({ centered: true });
        console.log(`local time ${end - start}ms.`);
      } else {
        var end = Date.now();
        this.showTeams(
          resp.get('teams'),
          resp.get('team_count'),
          resp.get('player_count'),
          resp.get('drop_count')
        );
        console.log(`local time ${end - start}ms. tries ${resp.get('tries')}`);
      }
    });
  }

  assignParams(params: Params): void {
    params.oktogether = this.oktogether;
    params.generations = this.generations;
    params.uneven = this.uneven;
    params.drop = this.drop;
    params.tries = this.tries;
    params.json = this.json;
    params.commas = this.commas;
    params.round = 'closest';
    params.separator = '';
    params.teamsize = -999;
    params.teamcount = -999;

    if (this.teamControl == 'size') {
      params.teamsize = this.sizeorcount;
      if (this.uneven) {
        params.round = this.rounding;
      }
    } else {
      params.teamcount = this.sizeorcount;
    }

    if (this.json) {
      params.commas = false;
    } else if (this.commas) {
      params.separator = ', ';
    }
  }

  build1Params(): Params {
    if (this.sizeorcount < 2) {
      this.sizeorcount = 2;
    }
    var params: Params = {
      oktogether: this.oktogether,
      generations: this.generations,
      uneven: this.uneven,
      drop: this.drop,
      tries: this.tries,
      json: this.json,
      commas: this.commas,
      round: 'closest',
      separator: '',
      teamsize: -999,
      teamcount: -999,
    };

    if (this.teamControl == 'size') {
      params.teamsize = this.sizeorcount;
      if (this.uneven) {
        params.round = this.rounding;
      }
    } else {
      params.teamcount = this.sizeorcount;
    }

    if (this.json) {
      params.commas = false;
    }

    return params;
  }

  onFileSelected(event: any): void {
    var fileReader = new FileReader();
    fileReader.onload = (e) => {
      if (fileReader.result) {
        this.familyText = fileReader.result.toString();
        this.dirty = true;
        this.getTeams();
      } else {
        this.toastMessage('File was empty');
      }
    };
    fileReader.readAsText(event.target.files[0]);
  }

  onLoadExampleClicked(): void {
    //    alert('hello ' + this.dirty);
    var load: boolean = true;
    if (this.dirty) {
      var dialogRef = this.dialog.open(LoadExampleDialog, {
        data: {
          message:
            'Looks like you changed the people list. Replace it with an example?',
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result == 'Yes') {
          this.loadExample();
          this.getTeams();
        }
      });
    } else {
      this.loadExample();
      this.getTeams();
    }
  }

  loadExample(): void {
    this.familyText = `\
Gordon Wallace: Hills Wallace
Ava Peters, Eric Peters : Weston Peters
Jack Manning: Craig Manning, Sara Manning
: Samantha Peake, Sister Peake
: Luke
: James Freeman
Felicity Allan:
Olivia Randall: Matthew Randall,Parker Randall
Parent Gray: Kid Gray`;
    this.dirty = false;
  }

  onValueChange(event: any): void {
    this.dirty = true;
  }
}

@Component({
  selector: 'load-example-dialog',
  templateUrl: 'load-example-dialog.html',
})
export class LoadExampleDialog {
  constructor(
    public dialogRef: MatDialogRef<LoadExampleDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}
  onYesClicked() {
    this.dialogRef.close('Yes');
  }
}

@Component({
  selector: 'help-dialog',
  templateUrl: 'help-dialog.html',
  styleUrls: ['button-overview-example.css'],
})
export class HelpDialog {
  constructor(
    public dialogRef: MatDialogRef<HelpDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private snackBar: MatSnackBar
  ) {}

  onCopyExample(): void {
    this.dialogRef.close();
    this.snackBar.open('Example Copied to Clipboard', '', {
      duration: 2000,
    });
  }
}

/**  Copyright 2023 Google LLC. All Rights Reserved.
    Use of this source code is governed by an MIT-style license that
    can be found in the LICENSE file at https://angular.io/license */
