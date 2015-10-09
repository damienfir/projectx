import {Rx} from '@cycle/core';
import {h} from '@cycle/dom'


function renderButton() {
  return h('.start-buttons', [
      h('button.btn.btn-default.btn-lg#create-btn', [
        h('i.fa.fa-book.fa-3x'),
        'Create album'
      ]), 
      h('span.or', 'or'),
      h('button.btn.btn-success.btn-lg#demo-btn', [
        h('i.fa.fa-rocket.fa-3x'),
        'View demo'
      ])
  ]);
}


function splitIntoSpreads(spreads, page) {
  if(spreads.length && spreads[spreads.length-1].length < 2) {
    spreads[spreads.length-1].push(page);
  } else {
    spreads.push([page]);
  }
  return spreads;
}


function spreadElement({DOM, prop$}) {
  let pages$ = 
  let vtree$ = props$.map(({spread}) =>
    h('.spread', [
      h('.spread-paper.shadow.clearfix', spread.map(renderPage(state))),
      h('.pages.clearfix', spread.map(({index}) =>
          h('span.page-btns' + leftOrRight(index), [
            h('span.page'+leftOrRight(index), "Page "+(index+1)),
            h('button.btn.btn-default.btn-sm.shuffle-btn', {'data-page': index, disabled: shuffling}, [h('i.fa.fa-refresh'), shuffling ? " Shuffling..." : " Shuffle"])
          ])))
  ]);

  return {
    DOM: vtree$
  }
}


module.exports = function({DOM, props$}) {
  let spreads$ = props$
    .map(({album}) => album.reduce(splitIntoSpreads, []))
    .map(spreads => spreadElement({DOM, }));

  let vtree$ = props$.combineLatest(spreads$, 
      (props, spreadsVTree) => 
        (album.length && !collection.get('photos').isEmpty()) ?
          h('div.container-fluid.limited-width.album',
            spreadsVTree) :
          renderButton()

  return {
    DOM: vtree$
  }
}
