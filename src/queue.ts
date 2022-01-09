import { logger } from './logger';

interface Task {
    (): Promise<void>;
}

export class Queue {
    private activeTasks = 0;

    private tasks: Task[] = [];

    private drainCbs: Array<() => void> = [];

    constructor(private maxTasks = 1, private queueUpdateCb: undefined | ((queueLength: number) => void) = undefined) {

    }

    public queue(task: () => Promise<void>) {
        this.tasks.push(task);

        if (this.queueUpdateCb) {
            this.queueUpdateCb(this.tasks.length);
        }

        this.maybeExecuteTask();
    }

    public drain(): Promise<void> {
        return new Promise((res) => {
            this.drainCbs.push(() => res(undefined));
        });
    }

    private async maybeExecuteTask() {
        if (this.activeTasks < this.maxTasks && this.tasks.length > 0) {
            try {
                this.activeTasks++;
                const task = this.tasks.shift()!;
                await task();
            } catch (error) {
                logger.error('Error executing task', error);
            } finally {
                if (this.queueUpdateCb) {
                    this.queueUpdateCb(this.tasks.length);
                }

                this.activeTasks--;

                if (this.tasks.length > 0) {
                    this.maybeExecuteTask();
                }
            }
        }

        if (this.tasks.length === 0 && this.activeTasks === 0) {
            const { drainCbs } = this;
            this.drainCbs = [];

            for (const cb of drainCbs) {
                try {
                    cb();
                } catch (error) {
                    logger.error('Error draining queue', error);
                }
            }
        }
    }
}
