import { refreshPage } from '../dxPageRefresh';

describe('dxPageRefresh', () => {
    let fire;

    beforeEach(() => {
        jest.useFakeTimers();
        fire = jest.fn();
        global.$A = { get: jest.fn(() => ({ fire })) };
    });

    afterEach(() => {
        jest.useRealTimers();
        delete global.$A;
    });

    it('fires the Aura refreshView event after the default 100 ms delay, and only once', () => {
        refreshPage();

        expect(fire).not.toHaveBeenCalled();
        jest.advanceTimersByTime(99);
        expect(fire).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1);

        expect(global.$A.get).toHaveBeenCalledWith('e.force:refreshView');
        expect(fire).toHaveBeenCalledTimes(1);
    });

    it('honours a custom delay', () => {
        refreshPage(500);

        jest.advanceTimersByTime(499);
        expect(fire).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1);
        expect(fire).toHaveBeenCalledTimes(1);
    });
});
