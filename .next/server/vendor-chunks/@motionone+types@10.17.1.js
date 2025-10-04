"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/@motionone+types@10.17.1";
exports.ids = ["vendor-chunks/@motionone+types@10.17.1"];
exports.modules = {

/***/ "(ssr)/./node_modules/.pnpm/@motionone+types@10.17.1/node_modules/@motionone/types/dist/MotionValue.es.js":
/*!**********************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@motionone+types@10.17.1/node_modules/@motionone/types/dist/MotionValue.es.js ***!
  \**********************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   MotionValue: () => (/* binding */ MotionValue)\n/* harmony export */ });\n/**\n * The MotionValue tracks the state of a single animatable\n * value. Currently, updatedAt and current are unused. The\n * long term idea is to use this to minimise the number\n * of DOM reads, and to abstract the DOM interactions here.\n */ class MotionValue {\n    setAnimation(animation) {\n        this.animation = animation;\n        animation === null || animation === void 0 ? void 0 : animation.finished.then(()=>this.clearAnimation()).catch(()=>{});\n    }\n    clearAnimation() {\n        this.animation = this.generator = undefined;\n    }\n}\n\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvLnBucG0vQG1vdGlvbm9uZSt0eXBlc0AxMC4xNy4xL25vZGVfbW9kdWxlcy9AbW90aW9ub25lL3R5cGVzL2Rpc3QvTW90aW9uVmFsdWUuZXMuanMiLCJtYXBwaW5ncyI6Ijs7OztBQUFBOzs7OztDQUtDLEdBQ0QsTUFBTUE7SUFDRkMsYUFBYUMsU0FBUyxFQUFFO1FBQ3BCLElBQUksQ0FBQ0EsU0FBUyxHQUFHQTtRQUNqQkEsY0FBYyxRQUFRQSxjQUFjLEtBQUssSUFBSSxLQUFLLElBQUlBLFVBQVVDLFFBQVEsQ0FBQ0MsSUFBSSxDQUFDLElBQU0sSUFBSSxDQUFDQyxjQUFjLElBQUlDLEtBQUssQ0FBQyxLQUFRO0lBQzdIO0lBQ0FELGlCQUFpQjtRQUNiLElBQUksQ0FBQ0gsU0FBUyxHQUFHLElBQUksQ0FBQ0ssU0FBUyxHQUFHQztJQUN0QztBQUNKO0FBRXVCIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vbWF0ZXJpYWwtdGFpbHdpbmQtZGFzaGJvYXJkLW5leHRqcy1wcm8vLi9ub2RlX21vZHVsZXMvLnBucG0vQG1vdGlvbm9uZSt0eXBlc0AxMC4xNy4xL25vZGVfbW9kdWxlcy9AbW90aW9ub25lL3R5cGVzL2Rpc3QvTW90aW9uVmFsdWUuZXMuanM/ODVhYyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRoZSBNb3Rpb25WYWx1ZSB0cmFja3MgdGhlIHN0YXRlIG9mIGEgc2luZ2xlIGFuaW1hdGFibGVcbiAqIHZhbHVlLiBDdXJyZW50bHksIHVwZGF0ZWRBdCBhbmQgY3VycmVudCBhcmUgdW51c2VkLiBUaGVcbiAqIGxvbmcgdGVybSBpZGVhIGlzIHRvIHVzZSB0aGlzIHRvIG1pbmltaXNlIHRoZSBudW1iZXJcbiAqIG9mIERPTSByZWFkcywgYW5kIHRvIGFic3RyYWN0IHRoZSBET00gaW50ZXJhY3Rpb25zIGhlcmUuXG4gKi9cbmNsYXNzIE1vdGlvblZhbHVlIHtcbiAgICBzZXRBbmltYXRpb24oYW5pbWF0aW9uKSB7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uID0gYW5pbWF0aW9uO1xuICAgICAgICBhbmltYXRpb24gPT09IG51bGwgfHwgYW5pbWF0aW9uID09PSB2b2lkIDAgPyB2b2lkIDAgOiBhbmltYXRpb24uZmluaXNoZWQudGhlbigoKSA9PiB0aGlzLmNsZWFyQW5pbWF0aW9uKCkpLmNhdGNoKCgpID0+IHsgfSk7XG4gICAgfVxuICAgIGNsZWFyQW5pbWF0aW9uKCkge1xuICAgICAgICB0aGlzLmFuaW1hdGlvbiA9IHRoaXMuZ2VuZXJhdG9yID0gdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuZXhwb3J0IHsgTW90aW9uVmFsdWUgfTtcbiJdLCJuYW1lcyI6WyJNb3Rpb25WYWx1ZSIsInNldEFuaW1hdGlvbiIsImFuaW1hdGlvbiIsImZpbmlzaGVkIiwidGhlbiIsImNsZWFyQW5pbWF0aW9uIiwiY2F0Y2giLCJnZW5lcmF0b3IiLCJ1bmRlZmluZWQiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/.pnpm/@motionone+types@10.17.1/node_modules/@motionone/types/dist/MotionValue.es.js\n");

/***/ })

};
;