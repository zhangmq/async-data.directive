import {
  Directive,
  OnChanges,
  Input,
  OnInit,
  ViewContainerRef,
  TemplateRef,
  SimpleChanges,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import {
  switchMap,
  map,
  catchError,
  scan,
  debounceTime,
  delay,
  refCount,
  publish,
} from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { merge } from 'rxjs/observable/merge';
import { Subscription } from 'rxjs/Subscription';
import { empty } from 'rxjs/observable/empty';

export interface AsyncDataContext<TResult> {
  $implicit: TResult;
  error: any;
  loading: boolean;
  refetch: (ignoreError: boolean) => void;
}

@Directive({
  selector:'[appAsyncData]',
  exportAs: 'appAsyncData',
})
export class AsyncDataDirective<TParams, TResult> implements OnInit, OnChanges, OnDestroy {
  @Input('appAsyncDataParams') params: TParams;

  @Input('appAsyncDataHandler') handler: (params: TParams) => Observable<TResult>;
 
  @Input('appAsyncDataPullIn') pullIn = 0;  //pull in ms, 0 = never pull, 

  private subscriptions: Subscription[] = [];

  private refetch$ = new Subject<boolean>();

  private result$ = this.refetch$.pipe(
    switchMap(ignoreError => this.handler(this.params).pipe(
      map(result => ({ $implicit: result, error: null, ignoreError })),
      catchError(error => of({
        $implicit: null,
        error,
        ignoreError,
      })),
    )),
    publish(),
    refCount(),
  );

  private pull$ = this.result$.pipe(
    map(() => this.pullIn),
    switchMap(duration => duration ? of(0).pipe(delay(duration)) : empty()),
  )

  private state$: Observable<AsyncDataContext<TResult>> = merge(
    this.refetch$.pipe(map(() => state => ({
      ...state,
      loading: true,
      error: null,
    }))),
    this.result$.pipe(map(result => state => ({
      ...state,
      $implicit: result.error && result.ignoreError
        ? state.$implicit
        : result.$implicit,
      error: result.error,
      loading: false,
    }))),
  ).pipe(
    scan((state, action: any) => action(state), {
      $implicit: null,
      error: null,
      loading: false,
    }),
    debounceTime(100),  //prevent state change too fast.
  );

  constructor(
    private container: ViewContainerRef,
    private template: TemplateRef<any>,
    private cdr: ChangeDetectorRef,
  ) {
    const stateSub = this.state$.subscribe(state => {
      this.container.clear();
      this.container.createEmbeddedView(this.template, {
        ...state,
        refetch: this.refetch,
      });
      this.cdr.markForCheck();
    });
    const pullSub = this.pull$.subscribe(() => {
      this.refetch();
    });

    this.subscriptions.push(stateSub, pullSub);
  }

  ngOnInit() {
    this.refetch();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.params && !changes.params.firstChange) {
      this.refetch();
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      sub.unsubscribe();
    });
  }

  refetch = (ignoreError = false) => {
    this.refetch$.next(ignoreError);
  }
}
