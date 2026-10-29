import { describe, expect, it } from 'vitest'
import { taskSlots, type Task, type TaskSlot, type WeekPlan } from '@/lib/board'
import {
  appendBacklogGroup, appendTask, backlogGroupsWithMove, draftTask, hasDraft, indexOf, insertAfter, isDraft, moveBacklogGroup,
  moveTask, removeBacklogGroup, removeTask, renameBacklogGroup, replaceTask, setTaskStatus, sweepToBacklog, sweepToNextWeek,
  unfinishedInDays,
} from './edits'

const made = (id: string, more: Partial<Task> = {}): Task => ({ id, title: id, status: 'open', week: '2026-10-26', slot: 'mon',
  backlogGroupId: null, position: 1000, estimateHours: null, importKey: null, link: null, chat: null, createdAt: '', updatedAt: '', ...more })
const backlogTask = (id: string, group: string, more: Partial<Task> = {}) => made(id, { slot: 'backlog', week: null, backlogGroupId: group, ...more })

function planOf(tasks: Task[]): WeekPlan {
  const slots = Object.fromEntries(taskSlots.map(slot => [slot, tasks.filter(task => task.slot === slot)])) as Record<TaskSlot, Task[]>
  return { week: '2026-10-26', goal: '', slots, backlogGroups: [
    { id: 'other', name: 'Other', position: 1000, isDefault: true }, { id: 'home', name: 'Home', position: 2000, isDefault: false }] }
}
const ids = (tasks: Task[]) => tasks.map(task => task.id)

describe('edits on a week', () => {
  it('changes, removes and appends tasks', () => {
    const plan = planOf([made('a'), made('b', { position: 2000 })])
    expect(replaceTask(plan, 'a', { title: 'A' }).slots.mon[0].title).toBe('A')
    expect(ids(removeTask(plan, 'a').slots.mon)).toEqual(['b'])
    expect(appendTask(plan, made('c')).slots.mon.at(-1)).toMatchObject({ id: 'c', position: 3000 })
  })

  it('moves a task to the edge of its new band, and a stop to the top of the open tasks', () => {
    const plan = planOf([made('a'), made('b', { position: 2000 }), backlogTask('x', 'home'), backlogTask('y', 'home', { position: 2000 })])
    expect(setTaskStatus(plan, 'missing', 'done')).toBe(plan)
    expect(setTaskStatus(plan, 'a', 'open')).toBe(plan)
    const started = setTaskStatus(plan, 'b', 'in_progress')
    expect(ids(started.slots.mon)).toEqual(['b', 'a'])
    expect(setTaskStatus(started, 'b', 'open').slots.mon[0]).toMatchObject({ id: 'b', position: 0 })
    expect(ids(setTaskStatus(plan, 'x', 'done').slots.backlog)).toEqual(['y', 'x'])
  })

  it('puts a new line after its row, or at the end when the row is gone or the gap is used up', () => {
    const plan = planOf([made('a'), made('b', { position: 2000 })])
    expect(ids(insertAfter(plan, 'a', made('n')).slots.mon)).toEqual(['a', 'n', 'b'])
    expect(ids(insertAfter(plan, 'gone', made('n')).slots.mon)).toEqual(['a', 'b', 'n'])
    const tight = planOf([made('a'), made('b', { position: 1000 + 1e-7 })])
    expect(ids(insertAfter(tight, 'a', made('n')).slots.mon)).toEqual(['a', 'b', 'n'])
  })

  it('moves a task to a place, and keeps a drop inside its band', () => {
    const plan = planOf([made('a'), made('b', { position: 2000 }), made('c', { slot: 'tue', status: 'done' }), backlogTask('x', 'home')])
    expect(moveTask(plan, 'missing', 'tue', 0)).toEqual({ plan, index: 0 })
    const toTue = moveTask(plan, 'a', 'tue', 5)
    expect(toTue.index).toBe(0)
    expect(ids(toTue.plan.slots.tue)).toEqual(['a', 'c'])
    const toBacklog = moveTask(plan, 'a', 'backlog', 0, 'home')
    expect(toBacklog.plan.slots.backlog[0]).toMatchObject({ id: 'a', week: null, backlogGroupId: 'home' })
    const fromBacklog = moveTask(plan, 'x', 'mon', 1)
    expect(fromBacklog.plan.slots.mon[1]).toMatchObject({ id: 'x', week: '2026-10-26', backlogGroupId: 'home' })
    const tight = planOf([made('a'), made('b', { position: 1000 + 1e-7 }), made('m', { slot: 'tue' })])
    expect(ids(moveTask(tight, 'm', 'mon', 1).plan.slots.mon)).toEqual(['a', 'b', 'm'])
  })

  it('finds a row in the order its cell shows', () => {
    const plan = planOf([made('a'), backlogTask('x', 'home')])
    expect(indexOf(plan, ['mon'], 'a')).toBe(0)
    expect(indexOf(plan, ['backlog'], 'x', 'home')).toBe(0)
  })

  it('makes drafts that the app has not stored', () => {
    const day = draftTask('2026-10-26', 'mon', 'New', 1, 'home')
    const backlog = draftTask('2026-10-26', 'backlog', 'New', null, 'home')
    expect(day).toMatchObject({ week: '2026-10-26', backlogGroupId: null, estimateHours: 1 })
    expect(backlog).toMatchObject({ week: null, backlogGroupId: 'home' })
    expect(isDraft(day)).toBe(true)
    expect(hasDraft(planOf([day]))).toBe(true)
    expect(hasDraft(planOf([made('a')]))).toBe(false)
  })

  it('sweeps unfinished day work to its group, or to next week', () => {
    const plan = planOf([made('a', { backlogGroupId: 'home' }), made('b', { backlogGroupId: 'home', position: 2000 }),
      made('c', { backlogGroupId: 'gone' }), made('d', { status: 'done' }), made('e', { slot: 'tue', status: 'in_progress' }),
      backlogTask('x', 'home')])
    expect(unfinishedInDays(plan)).toBe(4)
    const swept = sweepToBacklog(plan)
    expect(ids(swept.slots.mon)).toEqual(['d'])
    expect(swept.slots.backlog.map(task => [task.id, task.backlogGroupId, task.position])).toEqual([
      ['e', 'other', 1000], ['c', 'other', 1000], ['x', 'home', 1000], ['a', 'home', 2000], ['b', 'home', 3000]])
    expect(ids(sweepToNextWeek(plan).slots.mon)).toEqual(['d'])
  })

  it('adds, moves, renames and removes groups', () => {
    const plan = planOf([backlogTask('x', 'home'), backlogTask('y', 'other'), backlogTask('z', 'third'),
      made('a', { backlogGroupId: 'home' }), made('b')])
    const third = appendBacklogGroup(plan, { id: 'third', name: 'Third', position: 3000, isDefault: false })
    expect(third.backlogGroups.map(group => group.id)).toEqual(['other', 'home', 'third'])
    expect(moveBacklogGroup(third, 'third', -4).backlogGroups.map(group => [group.id, group.position]))
      .toEqual([['third', 1000], ['other', 2000], ['home', 3000]])
    expect(backlogGroupsWithMove(third.backlogGroups, 'missing', 0)).toBe(third.backlogGroups)
    expect(backlogGroupsWithMove(third.backlogGroups, 'other', 9).map(group => group.id)).toEqual(['home', 'third', 'other'])
    expect(renameBacklogGroup(third, 'home', 'House').backlogGroups[1].name).toBe('House')
    const removed = removeBacklogGroup(third, 'home')
    expect(removed.backlogGroups.map(group => group.id)).toEqual(['other', 'third'])
    expect(removed.slots.backlog.map(task => [task.id, task.backlogGroupId, task.position]))
      .toEqual([['y', 'other', 1000], ['x', 'other', 2000], ['z', 'third', 1000]])
    expect(removed.slots.mon.map(task => task.backlogGroupId)).toEqual(['other', null])
    expect(removeBacklogGroup(planOf([backlogTask('x', 'home')]), 'home').slots.backlog[0].position).toBe(1000)
  })
})
