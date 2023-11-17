import _ from 'lodash';

// =====================================================================================================================

export function diff(as, bs) {
    const added = _.differenceWith(as, bs, _.isEqual);
    const removed = _.differenceWith(bs, as, _.isEqual);

    return [added, removed];
}