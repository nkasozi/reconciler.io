!(function (global, factory) {
	'object' == typeof exports && 'undefined' != typeof module
		? (module.exports = factory())
		: 'function' == typeof define && define.amd
			? define(factory)
			: ((global = global || self).Alpine = factory());
})(this, function () {
	'use strict';
	function _defineProperty(obj, key, value) {
		return (
			key in obj
				? Object.defineProperty(obj, key, {
						value: value,
						enumerable: !0,
						configurable: !0,
						writable: !0
					})
				: (obj[key] = value),
			obj
		);
	}
	function ownKeys(object, enumerableOnly) {
		var keys = Object.keys(object);
		if (Object.getOwnPropertySymbols) {
			var symbols = Object.getOwnPropertySymbols(object);
			enumerableOnly &&
				(symbols = symbols.filter(function (sym) {
					return Object.getOwnPropertyDescriptor(object, sym).enumerable;
				})),
				keys.push.apply(keys, symbols);
		}
		return keys;
	}
	function _objectSpread2(target) {
		for (var i = 1; i < arguments.length; i++) {
			var source = null != arguments[i] ? arguments[i] : {};
			i % 2
				? ownKeys(Object(source), !0).forEach(function (key) {
						_defineProperty(target, key, source[key]);
					})
				: Object.getOwnPropertyDescriptors
					? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source))
					: ownKeys(Object(source)).forEach(function (key) {
							Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
						});
		}
		return target;
	}
	function arrayUnique(array) {
		for (var a = array.concat(), i = 0; i < a.length; ++i)
			for (var j = i + 1; j < a.length; ++j) a[i] === a[j] && a.splice(j--, 1);
		return a;
	}
	function isTesting() {
		return navigator.userAgent.includes('Node.js') || navigator.userAgent.includes('jsdom');
	}
	function saferEval(expression, dataContext, additionalHelperVariables = {}) {
		return new Function(
			['$data', ...Object.keys(additionalHelperVariables)],
			`var result; with($data) { result = ${expression} }; return result`
		)(dataContext, ...Object.values(additionalHelperVariables));
	}
	function saferEvalNoReturn(expression, dataContext, additionalHelperVariables = {}) {
		return new Function(
			['dataContext', ...Object.keys(additionalHelperVariables)],
			`with(dataContext) { ${expression} }`
		)(dataContext, ...Object.values(additionalHelperVariables));
	}
	function isXAttr(attr) {
		const name = replaceAtAndColonWithStandardSyntax(attr.name);
		return /x-(on|bind|data|text|html|model|if|for|show|cloak|transition|ref)/.test(name);
	}
	function getXAttrs(el, type) {
		return Array.from(el.attributes)
			.filter(isXAttr)
			.map((attr) => {
				const name = replaceAtAndColonWithStandardSyntax(attr.name),
					typeMatch = name.match(
						/x-(on|bind|data|text|html|model|if|for|show|cloak|transition|ref)/
					),
					valueMatch = name.match(/:([a-zA-Z\-:]+)/),
					modifiers = name.match(/\.[^.\]]+(?=[^\]]*$)/g) || [];
				return {
					type: typeMatch ? typeMatch[1] : null,
					value: valueMatch ? valueMatch[1] : null,
					modifiers: modifiers.map((i) => i.replace('.', '')),
					expression: attr.value
				};
			})
			.filter((i) => !type || i.type === type);
	}
	function replaceAtAndColonWithStandardSyntax(name) {
		return name.startsWith('@')
			? name.replace('@', 'x-on:')
			: name.startsWith(':')
				? name.replace(':', 'x-bind:')
				: name;
	}
	function transitionIn(el, callback, forceSkip = !1) {
		if (forceSkip) return callback();
		const attrs = getXAttrs(el, 'transition');
		if (attrs.length < 1) return callback();
		transition(
			el,
			(attrs.find((i) => 'enter' === i.value) || { expression: '' }).expression
				.split(' ')
				.filter((i) => '' !== i),
			(attrs.find((i) => 'enter-start' === i.value) || { expression: '' }).expression
				.split(' ')
				.filter((i) => '' !== i),
			(attrs.find((i) => 'enter-end' === i.value) || { expression: '' }).expression
				.split(' ')
				.filter((i) => '' !== i),
			callback,
			() => {}
		);
	}
	function transitionOut(el, callback, forceSkip = !1) {
		if (forceSkip) return callback();
		const attrs = getXAttrs(el, 'transition');
		if (attrs.length < 1) return callback();
		transition(
			el,
			(attrs.find((i) => 'leave' === i.value) || { expression: '' }).expression
				.split(' ')
				.filter((i) => '' !== i),
			(attrs.find((i) => 'leave-start' === i.value) || { expression: '' }).expression
				.split(' ')
				.filter((i) => '' !== i),
			(attrs.find((i) => 'leave-end' === i.value) || { expression: '' }).expression
				.split(' ')
				.filter((i) => '' !== i),
			() => {},
			callback
		);
	}
	function transition(el, classesDuring, classesStart, classesEnd, hook1, hook2) {
		const originalClasses = el.__x_original_classes || [];
		el.classList.add(...classesStart),
			el.classList.add(...classesDuring),
			requestAnimationFrame(() => {
				const duration = 1e3 * Number(getComputedStyle(el).transitionDuration.replace('s', ''));
				hook1(),
					requestAnimationFrame(() => {
						el.classList.remove(...classesStart.filter((i) => !originalClasses.includes(i))),
							el.classList.add(...classesEnd),
							setTimeout(() => {
								hook2(),
									el.isConnected &&
										(el.classList.remove(
											...classesDuring.filter((i) => !originalClasses.includes(i))
										),
										el.classList.remove(...classesEnd.filter((i) => !originalClasses.includes(i))));
							}, duration);
					});
			});
	}
	function handleForDirective(component, el, expression, initialUpdate) {
		const {
			single: single,
			bunch: bunch,
			iterator1: iterator1,
			iterator2: iterator2
		} = (function (expression) {
			const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/,
				inMatch = expression.match(/([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/);
			if (!inMatch) return;
			const res = {};
			res.bunch = inMatch[2].trim();
			const single = inMatch[1].trim().replace(/^\(|\)$/g, ''),
				iteratorMatch = single.match(forIteratorRE);
			iteratorMatch
				? ((res.single = single.replace(forIteratorRE, '').trim()),
					(res.iterator1 = iteratorMatch[1].trim()),
					iteratorMatch[2] && (res.iterator2 = iteratorMatch[2].trim()))
				: (res.single = single);
			return res;
		})(expression);
		var items = component.evaluateReturnExpression(el, bunch),
			previousEl = el;
		items.forEach((i, index, group) => {
			const currentKey = (function (component, el, single, iterator1, iterator2, i, index, group) {
				const keyAttr = getXAttrs(el, 'bind').filter((attr) => 'key' === attr.value)[0];
				let keyAliases = { [single]: i };
				iterator1 && (keyAliases[iterator1] = index);
				iterator2 && (keyAliases[iterator2] = group);
				return keyAttr
					? component.evaluateReturnExpression(el, keyAttr.expression, () => keyAliases)
					: index;
			})(component, el, single, iterator1, iterator2, i, index, group);
			let currentEl = previousEl.nextElementSibling;
			if (currentEl && void 0 !== currentEl.__x_for_key) {
				if (currentEl.__x_for_key !== currentKey)
					for (var tmpCurrentEl = currentEl; tmpCurrentEl; ) {
						if (tmpCurrentEl.__x_for_key === currentKey) {
							el.parentElement.insertBefore(tmpCurrentEl, currentEl), (currentEl = tmpCurrentEl);
							break;
						}
						tmpCurrentEl =
							!(
								!tmpCurrentEl.nextElementSibling ||
								void 0 === tmpCurrentEl.nextElementSibling.__x_for_key
							) && tmpCurrentEl.nextElementSibling;
					}
				delete currentEl.__x_for_key,
					(currentEl.__x_for_alias = single),
					(currentEl.__x_for_value = i),
					component.updateElements(currentEl, () => ({
						[currentEl.__x_for_alias]: currentEl.__x_for_value
					}));
			} else {
				const clone = document.importNode(el.content, !0);
				el.parentElement.insertBefore(clone, currentEl),
					(currentEl = previousEl.nextElementSibling),
					transitionIn(currentEl, () => {}, initialUpdate),
					(currentEl.__x_for_alias = single),
					(currentEl.__x_for_value = i),
					component.initializeElements(currentEl, () => ({
						[currentEl.__x_for_alias]: currentEl.__x_for_value
					}));
			}
			(currentEl.__x_for_key = currentKey), (previousEl = currentEl);
		});
		for (
			var nextElementFromOldLoop =
				!(!previousEl.nextElementSibling || void 0 === previousEl.nextElementSibling.__x_for_key) &&
				previousEl.nextElementSibling;
			nextElementFromOldLoop;

		) {
			const nextElementFromOldLoopImmutable = nextElementFromOldLoop,
				nextSibling = nextElementFromOldLoop.nextElementSibling;
			transitionOut(nextElementFromOldLoop, () => {
				nextElementFromOldLoopImmutable.remove();
			}),
				(nextElementFromOldLoop =
					!(!nextSibling || void 0 === nextSibling.__x_for_key) && nextSibling);
		}
	}
	function handleAttributeBindingDirective(component, el, attrName, expression, extraVars) {
		var value = component.evaluateReturnExpression(el, expression, extraVars);
		if ('value' === attrName)
			if ((void 0 === value && expression.match(/\./).length && (value = ''), 'radio' === el.type))
				el.checked = el.value == value;
			else if ('checkbox' === el.type)
				if (Array.isArray(value)) {
					let valueFound = !1;
					value.forEach((val) => {
						val == el.value && (valueFound = !0);
					}),
						(el.checked = valueFound);
				} else el.checked = !!value;
			else
				'SELECT' === el.tagName
					? (function (el, value) {
							const arrayWrappedValue = [].concat(value).map((value) => value + '');
							Array.from(el.options).forEach((option) => {
								option.selected = arrayWrappedValue.includes(option.value || option.text);
							});
						})(el, value)
					: (el.value = value);
		else if ('class' === attrName)
			if (Array.isArray(value)) {
				const originalClasses = el.__x_original_classes || [];
				el.setAttribute('class', arrayUnique(originalClasses.concat(value)).join(' '));
			} else if ('object' == typeof value)
				Object.keys(value).forEach((classNames) => {
					value[classNames]
						? classNames.split(' ').forEach((className) => el.classList.add(className))
						: classNames.split(' ').forEach((className) => el.classList.remove(className));
				});
			else {
				const originalClasses = el.__x_original_classes || [],
					newClasses = value.split(' ');
				el.setAttribute('class', arrayUnique(originalClasses.concat(newClasses)).join(' '));
			}
		else
			['disabled', 'readonly', 'required', 'checked', 'hidden', 'selected'].includes(attrName)
				? value
					? el.setAttribute(attrName, '')
					: el.removeAttribute(attrName)
				: el.setAttribute(attrName, value);
	}
	function registerListener(component, el, event, modifiers, expression, extraVars = {}) {
		if (modifiers.includes('away')) {
			const handler = (e) => {
				el.contains(e.target) ||
					(el.offsetWidth < 1 && el.offsetHeight < 1) ||
					(runListenerHandler(component, expression, e, extraVars),
					modifiers.includes('once') && document.removeEventListener(event, handler));
			};
			document.addEventListener(event, handler);
		} else {
			const listenerTarget = modifiers.includes('window')
					? window
					: modifiers.includes('document')
						? document
						: el,
				handler = (e) => {
					((function (event) {
						return ['keydown', 'keyup'].includes(event);
					})(event) &&
						(function (e, modifiers) {
							let keyModifiers = modifiers.filter(
								(i) => !['window', 'document', 'prevent', 'stop'].includes(i)
							);
							if (0 === keyModifiers.length) return !1;
							if (1 === keyModifiers.length && keyModifiers[0] === keyToModifier(e.key)) return !1;
							const selectedSystemKeyModifiers = [
								'ctrl',
								'shift',
								'alt',
								'meta',
								'cmd',
								'super'
							].filter((modifier) => keyModifiers.includes(modifier));
							if (
								((keyModifiers = keyModifiers.filter(
									(i) => !selectedSystemKeyModifiers.includes(i)
								)),
								selectedSystemKeyModifiers.length > 0)
							) {
								if (
									selectedSystemKeyModifiers.filter(
										(modifier) => (
											('cmd' !== modifier && 'super' !== modifier) || (modifier = 'meta'),
											e[`${modifier}Key`]
										)
									).length === selectedSystemKeyModifiers.length &&
									keyModifiers[0] === keyToModifier(e.key)
								)
									return !1;
							}
							return !0;
						})(e, modifiers)) ||
						(modifiers.includes('prevent') && e.preventDefault(),
						modifiers.includes('stop') && e.stopPropagation(),
						runListenerHandler(component, expression, e, extraVars),
						modifiers.includes('once') && listenerTarget.removeEventListener(event, handler));
				};
			listenerTarget.addEventListener(event, handler);
		}
	}
	function runListenerHandler(component, expression, e, extraVars) {
		component.evaluateCommandExpression(e.target, expression, () =>
			_objectSpread2({}, extraVars(), { $event: e })
		);
	}
	function keyToModifier(key) {
		switch (key) {
			case '/':
				return 'slash';
			case ' ':
			case 'Spacebar':
				return 'space';
			default:
				return key
					.replace(/([a-z])([A-Z])/g, '$1-$2')
					.replace(/[_\s]/, '-')
					.toLowerCase();
		}
	}
	function generateModelAssignmentFunction(el, modifiers, expression) {
		return (
			'radio' === el.type && (el.hasAttribute('name') || el.setAttribute('name', expression)),
			(event, currentValue) =>
				event instanceof CustomEvent
					? event.detail
					: 'checkbox' === el.type
						? Array.isArray(currentValue)
							? event.target.checked
								? currentValue.concat([event.target.value])
								: currentValue.filter((i) => i !== event.target.value)
							: event.target.checked
						: 'select' === el.tagName.toLowerCase() && el.multiple
							? modifiers.includes('number')
								? Array.from(event.target.selectedOptions).map((option) =>
										parseFloat(option.value || option.text)
									)
								: Array.from(event.target.selectedOptions).map(
										(option) => option.value || option.text
									)
							: modifiers.includes('number')
								? parseFloat(event.target.value)
								: modifiers.includes('trim')
									? event.target.value.trim()
									: event.target.value
		);
	}
	class Component {
		constructor(el) {
			this.$el = el;
			const dataAttr = this.$el.getAttribute('x-data'),
				dataExpression = '' === dataAttr ? '{}' : dataAttr,
				initExpression = this.$el.getAttribute('x-init'),
				createdExpression = this.$el.getAttribute('x-created'),
				mountedExpression = this.$el.getAttribute('x-mounted'),
				unobservedData = saferEval(dataExpression, {});
			var initReturnedCallback;
			(this.$data = this.wrapDataInObservable(unobservedData)),
				(unobservedData.$el = this.$el),
				(unobservedData.$refs = this.getRefsProxy()),
				(this.nextTickStack = []),
				(unobservedData.$nextTick = (callback) => {
					this.nextTickStack.push(callback);
				}),
				initExpression &&
					((this.pauseReactivity = !0),
					(initReturnedCallback = this.evaluateReturnExpression(this.$el, initExpression)),
					(this.pauseReactivity = !1)),
				createdExpression &&
					(console.warn(
						'AlpineJS Warning: "x-created" is deprecated and will be removed in the next major version. Use "x-init" instead.'
					),
					(this.pauseReactivity = !0),
					saferEvalNoReturn(this.$el.getAttribute('x-created'), this.$data),
					(this.pauseReactivity = !1)),
				this.initializeElements(this.$el),
				this.listenForNewElementsToInitialize(),
				'function' == typeof initReturnedCallback && initReturnedCallback.call(this.$data),
				mountedExpression &&
					(console.warn(
						'AlpineJS Warning: "x-mounted" is deprecated and will be removed in the next major version. Use "x-init" (with a callback return) for the same behavior.'
					),
					saferEvalNoReturn(mountedExpression, this.$data));
		}
		wrapDataInObservable(data) {
			var self = this;
			const proxyHandler = {
				set(obj, property, value) {
					const setWasSuccessful = value.$isAlpineProxy
						? Reflect.set(obj, property, value.$originalTarget)
						: Reflect.set(obj, property, value);
					return self.pauseReactivity
						? setWasSuccessful
						: (((func = () => {
								for (self.updateElements(self.$el); self.nextTickStack.length > 0; )
									self.nextTickStack.shift()();
							}),
							(wait = 0),
							function () {
								var context = this,
									args = arguments,
									later = function () {
										(timeout = null), func.apply(context, args);
									};
								clearTimeout(timeout), (timeout = setTimeout(later, wait));
							})(),
							setWasSuccessful);
					var func, wait, timeout;
				},
				get: (target, key) =>
					'$isAlpineProxy' === key ||
					('$originalTarget' === key
						? target
						: target[key] && target[key].$isRefsProxy
							? target[key]
							: target[key] && target[key] instanceof Node
								? target[key]
								: 'object' == typeof target[key] && null !== target[key]
									? new Proxy(target[key], proxyHandler)
									: target[key])
			};
			return new Proxy(data, proxyHandler);
		}
		walkAndSkipNestedComponents(el, callback, initializeComponentCallback = () => {}) {
			!(function walk(el, callback) {
				if (!1 === callback(el)) return;
				let node = el.firstElementChild;
				for (; node; ) walk(node, callback), (node = node.nextElementSibling);
			})(el, (el) =>
				el.hasAttribute('x-data') && !el.isSameNode(this.$el)
					? (el.__x || initializeComponentCallback(el), !1)
					: callback(el)
			);
		}
		initializeElements(rootEl, extraVars = () => {}) {
			for (
				this.walkAndSkipNestedComponents(
					rootEl,
					(el) => {
						if (void 0 !== el.__x_for_key) return !1;
						this.initializeElement(el, extraVars);
					},
					(el) => {
						el.__x = new Component(el);
					}
				);
				this.nextTickStack.length > 0;

			)
				this.nextTickStack.shift()();
		}
		initializeElement(el, extraVars) {
			el.hasAttribute('class') &&
				getXAttrs(el).length > 0 &&
				(el.__x_original_classes = el.getAttribute('class').split(' ')),
				this.registerListeners(el, extraVars),
				this.resolveBoundAttributes(el, !0, extraVars);
		}
		updateElements(rootEl, extraVars = () => {}) {
			this.walkAndSkipNestedComponents(
				rootEl,
				(el) => {
					if (void 0 !== el.__x_for_key && !el.isSameNode(this.$el)) return !1;
					this.updateElement(el, extraVars);
				},
				(el) => {
					el.__x = new Component(el);
				}
			);
		}
		updateElement(el, extraVars) {
			this.resolveBoundAttributes(el, !1, extraVars);
		}
		registerListeners(el, extraVars) {
			getXAttrs(el).forEach(
				({ type: type, value: value, modifiers: modifiers, expression: expression }) => {
					switch (type) {
						case 'on':
							registerListener(this, el, value, modifiers, expression, extraVars);
							break;
						case 'model':
							!(function (component, el, modifiers, expression, extraVars) {
								var event =
									'select' === el.tagName.toLowerCase() ||
									['checkbox', 'radio'].includes(el.type) ||
									modifiers.includes('lazy')
										? 'change'
										: 'input';
								registerListener(
									component,
									el,
									event,
									modifiers,
									`${expression} = rightSideOfExpression($event, ${expression})`,
									() =>
										_objectSpread2({}, extraVars(), {
											rightSideOfExpression: generateModelAssignmentFunction(
												el,
												modifiers,
												expression
											)
										})
								);
							})(this, el, modifiers, expression, extraVars);
					}
				}
			);
		}
		resolveBoundAttributes(el, initialUpdate = !1, extraVars) {
			getXAttrs(el).forEach(
				({ type: type, value: value, modifiers: modifiers, expression: expression }) => {
					switch (type) {
						case 'model':
							handleAttributeBindingDirective(this, el, 'value', expression, extraVars);
							break;
						case 'bind':
							if ('template' === el.tagName.toLowerCase() && 'key' === value) return;
							handleAttributeBindingDirective(this, el, value, expression, extraVars);
							break;
						case 'text':
							void 0 === (output = this.evaluateReturnExpression(el, expression, extraVars)) &&
								expression.match(/\./).length &&
								(output = ''),
								(el.innerText = output);
							break;
						case 'html':
							el.innerHTML = this.evaluateReturnExpression(el, expression, extraVars);
							break;
						case 'show':
							var output = this.evaluateReturnExpression(el, expression, extraVars);
							!(function (el, value, initialUpdate = !1) {
								value
									? '' !== el.style.display &&
										transitionIn(
											el,
											() => {
												1 === el.style.length
													? el.removeAttribute('style')
													: el.style.removeProperty('display');
											},
											initialUpdate
										)
									: 'none' !== el.style.display &&
										transitionOut(
											el,
											() => {
												el.style.display = 'none';
											},
											initialUpdate
										);
							})(el, output, initialUpdate);
							break;
						case 'if':
							output = this.evaluateReturnExpression(el, expression, extraVars);
							!(function (el, expressionResult, initialUpdate) {
								'template' !== el.nodeName.toLowerCase() &&
									console.warn(
										'Alpine: [x-if] directive should only be added to <template> tags. See https://github.com/alpinejs/alpine#x-if'
									);
								const elementHasAlreadyBeenAdded =
									el.nextElementSibling && !0 === el.nextElementSibling.__x_inserted_me;
								if (expressionResult && !elementHasAlreadyBeenAdded) {
									const clone = document.importNode(el.content, !0);
									el.parentElement.insertBefore(clone, el.nextElementSibling),
										(el.nextElementSibling.__x_inserted_me = !0),
										transitionIn(el.nextElementSibling, () => {}, initialUpdate);
								} else
									!expressionResult &&
										elementHasAlreadyBeenAdded &&
										transitionOut(
											el.nextElementSibling,
											() => {
												el.nextElementSibling.remove();
											},
											initialUpdate
										);
							})(el, output, initialUpdate);
							break;
						case 'for':
							handleForDirective(this, el, expression, initialUpdate);
							break;
						case 'cloak':
							el.removeAttribute('x-cloak');
					}
				}
			);
		}
		evaluateReturnExpression(el, expression, extraVars = () => {}) {
			return saferEval(
				expression,
				this.$data,
				_objectSpread2({}, extraVars(), { $dispatch: this.getDispatchFunction(el) })
			);
		}
		evaluateCommandExpression(el, expression, extraVars = () => {}) {
			saferEvalNoReturn(
				expression,
				this.$data,
				_objectSpread2({}, extraVars(), { $dispatch: this.getDispatchFunction(el) })
			);
		}
		getDispatchFunction(el) {
			return (event, detail = {}) => {
				el.dispatchEvent(new CustomEvent(event, { detail: detail, bubbles: !0 }));
			};
		}
		listenForNewElementsToInitialize() {
			const targetNode = this.$el;
			new MutationObserver((mutations) => {
				for (let i = 0; i < mutations.length; i++) {
					const closestParentComponent = mutations[i].target.closest('[x-data]');
					if (!closestParentComponent || !closestParentComponent.isSameNode(this.$el)) return;
					if ('attributes' === mutations[i].type && 'x-data' === mutations[i].attributeName) {
						const rawData = saferEval(mutations[i].target.getAttribute('x-data'), {});
						Object.keys(rawData).forEach((key) => {
							this.$data[key] !== rawData[key] && (this.$data[key] = rawData[key]);
						});
					}
					mutations[i].addedNodes.length > 0 &&
						mutations[i].addedNodes.forEach((node) => {
							1 === node.nodeType &&
								(node.matches('[x-data]')
									? (node.__x = new Component(node))
									: this.initializeElements(node));
						});
				}
			}).observe(targetNode, { childList: !0, attributes: !0, subtree: !0 });
		}
		getRefsProxy() {
			var self = this;
			return new Proxy(
				{},
				{
					get(object, property) {
						return (
							'$isRefsProxy' === property ||
							(self.walkAndSkipNestedComponents(self.$el, (el) => {
								el.hasAttribute('x-ref') && el.getAttribute('x-ref') === property && (ref = el);
							}),
							ref)
						);
						var ref;
					}
				}
			);
		}
	}
	const Alpine = {
		start: async function () {
			isTesting() ||
				(await new Promise((resolve) => {
					'loading' == document.readyState
						? document.addEventListener('DOMContentLoaded', resolve)
						: resolve();
				})),
				this.discoverComponents((el) => {
					this.initializeComponent(el);
				}),
				document.addEventListener('turbolinks:load', () => {
					this.discoverUninitializedComponents((el) => {
						this.initializeComponent(el);
					});
				}),
				this.listenForNewUninitializedComponentsAtRunTime((el) => {
					this.initializeComponent(el);
				});
		},
		discoverComponents: function (callback) {
			document.querySelectorAll('[x-data]').forEach((rootEl) => {
				callback(rootEl);
			});
		},
		discoverUninitializedComponents: function (callback, el = null) {
			const rootEls = (el || document).querySelectorAll('[x-data]');
			Array.from(rootEls)
				.filter((el) => void 0 === el.__x)
				.forEach((rootEl) => {
					callback(rootEl);
				});
		},
		listenForNewUninitializedComponentsAtRunTime: function (callback) {
			const targetNode = document.querySelector('body');
			new MutationObserver((mutations) => {
				for (let i = 0; i < mutations.length; i++)
					mutations[i].addedNodes.length > 0 &&
						mutations[i].addedNodes.forEach((node) => {
							1 === node.nodeType &&
								((node.parentElement && node.parentElement.closest('[x-data]')) ||
									this.discoverUninitializedComponents((el) => {
										this.initializeComponent(el);
									}, node.parentElement));
						});
			}).observe(targetNode, { childList: !0, attributes: !0, subtree: !0 });
		},
		initializeComponent: function (el) {
			el.__x || (el.__x = new Component(el));
		}
	};
	return isTesting() || ((window.Alpine = Alpine), window.Alpine.start()), Alpine;
});
//# sourceMappingURL=alpine.js.map
