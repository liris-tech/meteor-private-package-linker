import _ from 'lodash';

// =====================================================================================================================

export function selectLinesFromText(text, options) {
    const { from, to, matches} = options || {};

    if (!_.some([_.isNil, _.isNumber, _.isRegExp, _.isString, _.isFunction], (p) => p(from))) {
        throw new Error(`Received start: ${from}. Must be one of the following:
							a line number, a regexp condition, a substring or a predicate`)
    }

    if (!_.some([_.isNil, _.isNumber, _.isRegExp, _.isString, _.isFunction], (p) => p(to))) {
        throw new Error(`Received end: ${to}. Must be one of the following:
							a line number, a regexp condition, a substring or a predicate`)
    }

    if (!_.some([_.isNil, _.isRegExp, _.isString, _.isFunction], (p) => p(matches))) {
        throw new Error(`Received contains: ${matches}. Must be one of the following:
							a regexp condition, a substring or a predicate`)
    }

    const selectedLines = [];

    let fromCondition = false;
    let toCondition = false;

    for (const [i, line] of text.split('\n').entries()) {
        if ((_.isNil(from)) ||
            (_.isNumber(from) && i >= from) ||
            (_.isRegExp(from) && from.test(line)) ||
            (_.isString(from) && line.includes(from)) ||
            (_.isFunction(from) && from(line))) {
                fromCondition = true;
        }

        if ((_.isNumber(to) && i >= to) ||
            (_.isRegExp(to) && to.test(line) && fromCondition === true) ||
            (_.isString(to) && line.includes(to) && fromCondition === true) ||
            (_.isFunction(to) && to(line) && fromCondition === true)) {
                toCondition = false;
        }

        const isMatch = (
            (_.isNil(matches)) ||
            (_.isString(matches) && line.includes(matches)) ||
            (_.isRegExp(matches) && matches.test(line)) ||
            (_.isFunction(matches) && matches(line))
        );

        if (fromCondition && !toCondition && isMatch) {
            selectedLines.push(line);
        }
    }

    return selectedLines;
}