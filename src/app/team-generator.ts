import {
  Component,
  Renderer2,
  Inject,
  ViewChild,
  ElementRef,
  OnInit,
} from '@angular/core';
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
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

export interface DialogData {
  message: string;
}

// Set only if num is betwee min and max (inclusive) when min and max are not null
function setIfBetween(
  check: string | null,
  min: number | null,
  max: number | null,
  setter: (num: number) => void
): void {
  let num = Number(check);
  if (check != null && !Number.isNaN(num)) {
    if ((min == null || num >= min) && (max == null || num <= max)) {
      setter(num);
    }
  }
}

function setIfBoolean(
  check: string | null,
  setter: (bool: boolean) => void
): void {
  if (check != null) {
    if (['true', '1', 'yes', 'on'].includes(check.toLowerCase())) {
      setter(true);
    } else if (['false', '0', 'no', 'off'].includes(check.toLowerCase())) {
      setter(false);
    }
  }
}

/**
 * @title Teams
 */
@Component({
  selector: 'team-generator',
  templateUrl: 'team-generator.html',
  providers: [TeamsService],
  styleUrls: ['team-generator.css'],
})
export class TeamGenerator implements OnInit {
  private mouseDown = false;
  private pyodide: any = undefined;
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
  @ViewChild('peopleField') peopleField: ElementRef;
  @ViewChild('teamField') teamField: ElementRef;
  @ViewChild('inputArea') inputArea: ElementRef;

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
    private snackBar: MatSnackBar,
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) {
    this.dirty = false;
    this.hylatReady = this.loadHylat();
    this.matIconRegistry.addSvgIcon(
      "github",
      this.domSanitizer.bypassSecurityTrustResourceUrl("../assets/github-circle-white-transparent.svg")
    );
  }

  setSizeOrCount(teamsize: string | null, teamcount: string | null) {
    if (teamsize) {
      this.teamControl = 'size';
      setIfBetween(teamsize, 2, null, (num) => {
        this.sizeorcount = num;
      });
    } else if (teamcount) {
      this.teamControl = 'count';
      setIfBetween(teamcount, 2, null, (num) => {
        this.sizeorcount = num;
      });
    }
  }

  setOkTogether(ok: string | null) {
    setIfBoolean(ok, (bool) => {
      this.oktogether = bool;
    });
  }

  setGenerations(gens: string | null) {
    setIfBoolean(gens, (bool) => {
      this.generations = bool;
    });
  }

  setRounding(rounding: string | null) {
    if (['closest', 'down', 'up'].includes(rounding!)) {
      this.rounding = rounding!;
    }
  }

  setUnevenOrDrop(uneven: string | null, drop: string | null) {
    setIfBoolean(uneven, (bool) => {
      this.uneven = bool;
    });
    if (this.uneven) {
      this.drop = false;
    } else {
      setIfBoolean(drop, (bool) => {
        this.drop = bool;
      });
    }
  }

  setJsonOrCommas(json: string | null, commas: string | null) {
    setIfBoolean(json, (bool) => {
      this.json = bool;
    });
    if (this.json) {
      this.commas = false;
    } else {
      setIfBoolean(commas, (bool) => {
        this.commas = bool;
      });
    }
  }

  ngOnInit(): void {
    // local storage first so that url params win
    this.setSizeOrCount(
      localStorage.getItem('teamsize'),
      localStorage.getItem('teamcount')
    );
    this.setOkTogether(localStorage.getItem('oktogether'));
    this.setGenerations(localStorage.getItem('generations'));
    this.setUnevenOrDrop(
      localStorage.getItem('uneven'),
      localStorage.getItem('drop')
    );
    this.setJsonOrCommas(
      localStorage.getItem('json'),
      localStorage.getItem('commas')
    );
    this.setRounding(localStorage.getItem('rounding'));

    var params = new HttpParams({ fromString: window.location.search });

    this.setSizeOrCount(params.get('teamsize'), params.get('teamcount'));
    this.setOkTogether(params.get('oktogether'));
    this.setGenerations(params.get('generations'));
    this.setUnevenOrDrop(params.get('uneven'), params.get('drop'));
    this.setJsonOrCommas(params.get('json'), params.get('commas'));
    this.setRounding(params.get('rounding'));

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
    if (this.rounding != 'closest') {
      params = params.append('rounding', this.rounding);
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

    localStorage.clear();
  }

  saveOptions(): void {
    // Done this way to match onNewPage
    if (this.teamControl == 'count') {
      localStorage.setItem('teamcount', this.sizeorcount.toString());
      localStorage.removeItem('teamsize');
    } else if (this.sizeorcount != 2) {
      localStorage.setItem('teamsize', this.sizeorcount.toString());
      localStorage.removeItem('teamcount');
    }

    localStorage.setItem('oktogether', this.oktogether.toString());
    localStorage.setItem('generations', this.generations.toString());
    localStorage.setItem('uneven', this.uneven.toString());
    localStorage.setItem('drop', this.drop.toString());
    localStorage.setItem('json', this.json.toString());
    localStorage.setItem('commas', this.commas.toString());
    localStorage.setItem('rounding', this.rounding);
  }

  async loadHylat() {
    return loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
      stdLibURL:
        'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/python_stdlib.zip',
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
          ? fetch('https://teams.schicks.net/assets/hylat.zip', { method: 'GET' })
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

  onDraggerMouseDown(): void {
    this.mouseDown = true;
  }

  onDraggerMouseMove(event: MouseEvent): void {
    if (this.mouseDown) {
      var pointerRelativeXpos =
        event.clientX - this.inputArea.nativeElement.offsetLeft;
      const minWidth = 200;

      const areaWidth = this.inputArea.nativeElement.offsetWidth - 16; // 16 for the size of the drag area
      const peopleWidth = this.peopleField.nativeElement.offsetWidth;
      const teamWidth = this.teamField.nativeElement.offsetWidth;

      var newPeopleWidth = Math.max(minWidth, pointerRelativeXpos - 8); // 8 to center in drag area

      this.peopleField.nativeElement.style.flexGrow =
        newPeopleWidth / areaWidth;
      this.teamField.nativeElement.style.flexGrow =
        (areaWidth - newPeopleWidth) / areaWidth;
    }
  }

  onDraggerMouseUp(): void {
    this.mouseDown = false;
  }

  onDropChange(): void {
    if (this.drop) {
      this.uneven = false;
    }
  }

  onUnevenChange(): void {
    if (this.uneven) {
      this.drop = false;
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
    drop_count: number,
    category_count: number
  ): void {
    var label = `${team_count} Teams, ${player_count} Players${
      this.drop ? ' (' + drop_count + ' dropped)' : ''
    }, ${category_count} ${category_count > 1 ? 'Categories' : 'Category'}`;
    this.teamText = teams;
    this.errorColor = false;
    this.teamsLabel = label;

    this.saveOptions();
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
          resp['drop_count'],
          resp['category_count']
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
    this.showProgress = true;

    // Making this async doesn't really help because the processing still
    // happens on the main thread (preventing UI refesh). Would have to
    // movethis to a webworker
    this.hylatReady.then(async () => {
      if (!this.hylat) {
        this.showProgress = false;
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
        this.showProgress = false;
        var end = Date.now();
        this.showError(err);
        this.ripple.launch({ centered: true });
        console.log(`local time ${end - start}ms.`);
      } else {
        this.showProgress = false;
        var end = Date.now();
        this.showTeams(
          resp.get('teams'),
          resp.get('team_count'),
          resp.get('player_count'),
          resp.get('drop_count'),
          resp.get('category_count')
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

  onClickFileUpload(event:any) {
    // needed to clear previous value so that onchange fires
    event.target.value = '';
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
Hills Wallace: Gordon Wallace
Weston Peters: Ava Peters, Eric Peters
Jack Rossing, Kelly Rossing: Craig Manning, Sara Ross
Samantha Peake, Sister Peake
Luke
James Freeman
: Felicity Allan, Bella Coleman
Matthew Randall,Parker Randall: Olivia Randall
Kid Gray: Parent Gray`;
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
  styleUrls: ['team-generator.css'],
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
