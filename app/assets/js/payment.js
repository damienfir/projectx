import {Rx} from '@cycle/core';
import {h} from '@cycle/dom';
import braintree from 'braintree-web'
let Observable = Rx.Observable;


function view() {
  return Observable.just(h('form.container', [
      h('.row', [
        h('.col-lg-4.form-group', [
          h('label', {'for': 'name'}, 'Your Name'),
          h('input.form-control', {'name': 'name', 'placeholder': ''})]),
      h('.col-lg-4.form-group', [
        h('label', {'for': 'email'}, 'Your Email'),
        h('span.input-group-addon', '@'),
        h('input.form-control', {'name': 'email', 'placeholder': 'name@example.com'})]),
      ]),
      h('.row', [
        h('.col-lg-12.form-group', [
          h('label', {'for': 'address'}, 'Address'),
          h('input.form-control', {'name': 'address', 'placeholder': 'Street & number'})]),
      ]),
      h('.row', [
        h('.col-lg-3.form-group', [
          h('label', {'for': 'zip'}, 'Zip Code'),
          h('input.form-control', {'name': 'zip', 'placeholder': ''})]),
        h('.col-lg-4.form-group', [
          h('label', {'for': 'city'}, 'City'),
          h('input.form-control', {'name': 'city', 'placeholder': ''})]),
        h('.col-lg-5.form-group', [
          h('label', {'for': 'country'}),
          h('input.form-control', {'name': 'country', 'placeholder': ''})]),
      ]),
      h('.row', [
        h('.form-group', [
          h('label', {'for': 'name'}),
          h('input.form-control', {'name': 'cc-number', 'placeholder': '####-####-####-####'})]),
        h('.form-group', [
          h('label', {'for': 'name'}),
          h('input.form-control', {'name': 'cc-name'})]),
        h('.form-group', [
          h('label', {'for': 'cc-date'}, 'Expiration date'),
          h('input.form-control', {'name': 'cc-date', 'placeholder': 'MM/YY'})]),
      ])
  ]))
}

module.exports = function() {

  let vtree$ = view();

  return {
    DOM: vtree$
  }
}
