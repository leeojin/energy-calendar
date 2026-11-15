package com.energycal.calc

import com.energycal.calc.EnergyCalc.BudgetEntry
import com.energycal.calc.EnergyCalc.CostItem
import com.energycal.calc.EnergyCalc.MoveSubject
import com.energycal.calc.EnergyCalc.VisibilityLink
import com.energycal.calc.EnergyCalc.VisibilityTask
import com.energycal.calc.EnergyCalc.WeekTitle
import com.energycal.common.ErrorCode
import com.energycal.condition.entity.ConditionLevel
import com.energycal.share.dto.LinkExpiry
import com.energycal.share.dto.PublicTaskStatus
import com.energycal.share.entity.ShareLinkStatus
import com.energycal.task.entity.TaskStatus
import com.energycal.task.entity.TimeSlot
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.YearMonth
import java.time.ZoneId
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class EnergyCalcTest {
    private val today = d(2026, 11, 4)

    private fun d(
        y: Int,
        m: Int,
        day: Int,
    ): LocalDate = LocalDate.of(y, m, day)

    @Test
    fun `오늘은 서울 시각으로 계산한다`() {
        val clock = Clock.fixed(Instant.parse("2026-11-03T15:30:00Z"), ZoneId.of("UTC"))
        assertEquals(today, EnergyCalc.today(clock))
    }

    @Test
    fun `수요일의 주 시작은 그 주 월요일이다`() {
        assertEquals(d(2026, 11, 2), EnergyCalc.weekStart(d(2026, 11, 4)))
    }

    @Test
    fun `월요일의 주 시작은 그날이다`() {
        assertEquals(d(2026, 11, 2), EnergyCalc.weekStart(d(2026, 11, 2)))
    }

    @Test
    fun `일요일의 주 시작은 앞 월요일이다`() {
        assertEquals(d(2026, 11, 2), EnergyCalc.weekStart(d(2026, 11, 8)))
    }

    @Test
    fun `해를 넘기는 주의 시작은 지난해 월요일이다`() {
        assertEquals(d(2026, 12, 28), EnergyCalc.weekStart(d(2027, 1, 1)))
    }

    @Test
    fun `월요일인지 판단한다`() {
        assertTrue(EnergyCalc.isMonday(d(2026, 11, 2)))
        assertFalse(EnergyCalc.isMonday(d(2026, 11, 3)))
    }

    @Test
    fun `주 날짜는 월요일부터 7일이다`() {
        val dates = EnergyCalc.weekDates(d(2026, 11, 2))
        assertEquals(7, dates.size)
        assertEquals(d(2026, 11, 2), dates.first())
        assertEquals(d(2026, 11, 8), dates.last())
    }

    @Test
    fun `잠금선은 지난주 월요일이다`() {
        assertEquals(d(2026, 10, 26), EnergyCalc.lockDate(today))
    }

    @Test
    fun `잠금선 앞 날은 잠기고 잠금선 날은 잠기지 않는다`() {
        assertTrue(EnergyCalc.isLocked(d(2026, 10, 25), today))
        assertFalse(EnergyCalc.isLocked(d(2026, 10, 26), today))
    }

    @Test
    fun `월요일이 되면 잠금선이 한 주 넘어간다`() {
        assertEquals(d(2026, 11, 2), EnergyCalc.lockDate(d(2026, 11, 9)))
    }

    @Test
    fun `주 제목은 목요일이 든 달의 첫째 주다`() {
        assertEquals(WeekTitle(2026, 11, 1), EnergyCalc.weekTitle(d(2026, 11, 2)))
    }

    @Test
    fun `10월 26일 주는 10월 다섯째 주다`() {
        assertEquals(WeekTitle(2026, 10, 5), EnergyCalc.weekTitle(d(2026, 10, 26)))
    }

    @Test
    fun `12월 28일 주는 12월 다섯째 주다`() {
        assertEquals(WeekTitle(2026, 12, 5), EnergyCalc.weekTitle(d(2026, 12, 28)))
    }

    @Test
    fun `해를 넘기는 주는 연도도 목요일 기준이다`() {
        assertEquals(WeekTitle(2026, 1, 1), EnergyCalc.weekTitle(d(2025, 12, 29)))
    }

    @Test
    fun `6월 29일 주는 7월 첫째 주다`() {
        assertEquals(WeekTitle(2026, 7, 1), EnergyCalc.weekTitle(d(2026, 6, 29)))
    }

    @Test
    fun `달 날짜는 1일부터 말일까지다`() {
        val dates = EnergyCalc.monthDates(YearMonth.of(2026, 11))
        assertEquals(30, dates.size)
        assertEquals(d(2026, 11, 1), dates.first())
        assertEquals(d(2026, 11, 30), dates.last())
    }

    @Test
    fun `2026년 11월에 걸치는 주는 6개다`() {
        val starts = EnergyCalc.weekStartsOverlapping(YearMonth.of(2026, 11))
        assertEquals(
            listOf(
                d(2026, 10, 26),
                d(2026, 11, 2),
                d(2026, 11, 9),
                d(2026, 11, 16),
                d(2026, 11, 23),
                d(2026, 11, 30),
            ),
            starts,
        )
    }

    @Test
    fun `월요일로 시작하는 2027년 2월은 그날부터 4주다`() {
        val starts = EnergyCalc.weekStartsOverlapping(YearMonth.of(2027, 2))
        assertEquals(
            listOf(d(2027, 2, 1), d(2027, 2, 8), d(2027, 2, 15), d(2027, 2, 22)),
            starts,
        )
    }

    @Test
    fun `주 범위는 월요일 0시부터 다음 월요일 0시까지다`() {
        val (from, to) = EnergyCalc.weekRange(d(2026, 11, 2))
        assertEquals(LocalDateTime.of(2026, 11, 2, 0, 0), from)
        assertEquals(LocalDateTime.of(2026, 11, 9, 0, 0), to)
    }

    @Test
    fun `이번 주에서 8주 뒤까지는 회차 범위 안이고 9주 뒤는 밖이다`() {
        assertFalse(EnergyCalc.isBeyondOccurrenceRange(d(2026, 12, 28), today))
        assertTrue(EnergyCalc.isBeyondOccurrenceRange(d(2027, 1, 4), today))
    }

    private val history = listOf(BudgetEntry(d(2026, 10, 1), 12), BudgetEntry(d(2026, 11, 4), 10))

    @Test
    fun `그날 이전 가장 최근 기록의 평소 배터리를 쓴다`() {
        assertEquals(12, EnergyCalc.budgetOn(d(2026, 11, 3), history))
        assertEquals(10, EnergyCalc.budgetOn(d(2026, 11, 4), history))
        assertEquals(10, EnergyCalc.budgetOn(d(2026, 11, 10), history))
    }

    @Test
    fun `첫 기록보다 앞 날은 첫 기록 값을 쓴다`() {
        assertEquals(12, EnergyCalc.budgetOn(d(2026, 9, 28), history))
    }

    @Test
    fun `순서가 섞인 기록도 같은 결과다`() {
        val shuffled = history.reversed()
        assertEquals(12, EnergyCalc.budgetOn(d(2026, 11, 3), shuffled))
        assertEquals(10, EnergyCalc.budgetOn(d(2026, 11, 4), shuffled))
        assertEquals(10, EnergyCalc.budgetOn(d(2026, 11, 10), shuffled))
        assertEquals(12, EnergyCalc.budgetOn(d(2026, 9, 28), shuffled))
    }

    @Test
    fun `기록이 한 줄이면 늘 그 값이다`() {
        val one = listOf(BudgetEntry(d(2026, 11, 1), 8))
        assertEquals(8, EnergyCalc.budgetOn(d(2026, 10, 1), one))
        assertEquals(8, EnergyCalc.budgetOn(d(2026, 11, 1), one))
        assertEquals(8, EnergyCalc.budgetOn(d(2026, 12, 1), one))
    }

    @Test
    fun `지금 평소 배터리는 가장 늦은 시작일의 값이다`() {
        assertEquals(10, EnergyCalc.currentBudget(history))
        assertEquals(10, EnergyCalc.currentBudget(history.reversed()))
    }

    @Test
    fun `컨디션별 오늘 배터리 - 12`() {
        assertEquals(6, EnergyCalc.dayBudget(12, ConditionLevel.LOW))
        assertEquals(12, EnergyCalc.dayBudget(12, ConditionLevel.NORMAL))
        assertEquals(14, EnergyCalc.dayBudget(12, ConditionLevel.GOOD))
        assertEquals(0, EnergyCalc.dayBudget(12, ConditionLevel.REST))
    }

    @Test
    fun `컨디션별 오늘 배터리는 내림한다`() {
        assertEquals(6, EnergyCalc.dayBudget(13, ConditionLevel.LOW))
        assertEquals(15, EnergyCalc.dayBudget(13, ConditionLevel.GOOD))
        assertEquals(0, EnergyCalc.dayBudget(1, ConditionLevel.LOW))
        assertEquals(1, EnergyCalc.dayBudget(1, ConditionLevel.GOOD))
        assertEquals(36, EnergyCalc.dayBudget(30, ConditionLevel.GOOD))
        assertEquals(6, EnergyCalc.dayBudget(5, ConditionLevel.GOOD))
    }

    @Test
    fun `쓴 칸은 할 일과 했어요를 더하고 했어요 칸은 했어요만 더한다`() {
        val items = listOf(CostItem(3, TaskStatus.PLANNED), CostItem(2, TaskStatus.DONE))
        assertEquals(5, EnergyCalc.usedEnergy(items))
        assertEquals(2, EnergyCalc.doneEnergy(items))
    }

    @Test
    fun `지운 할 일은 들어와도 빼고 센다`() {
        val items =
            listOf(
                CostItem(3, TaskStatus.PLANNED),
                CostItem(2, TaskStatus.DONE),
                CostItem(4, TaskStatus.DELETED),
            )
        assertEquals(5, EnergyCalc.usedEnergy(items))
        assertEquals(2, EnergyCalc.doneEnergy(items))
    }

    @Test
    fun `남은 칸은 음수가 될 수 있고 넘침은 0 아래로 가지 않는다`() {
        assertEquals(-2, EnergyCalc.remainingEnergy(6, 8))
        assertEquals(2, EnergyCalc.overflowEnergy(6, 8))
        assertEquals(7, EnergyCalc.remainingEnergy(12, 5))
        assertEquals(0, EnergyCalc.overflowEnergy(12, 5))
    }

    @Test
    fun `충전 중인 날은 쓴 만큼 넘친다`() {
        assertEquals(-3, EnergyCalc.remainingEnergy(0, 3))
        assertEquals(3, EnergyCalc.overflowEnergy(0, 3))
    }

    @Test
    fun `어제는 만들 수 없고 오늘과 내일은 만들 수 있다`() {
        assertFalse(EnergyCalc.canCreateOn(d(2026, 11, 3), today))
        assertTrue(EnergyCalc.canCreateOn(today, today))
        assertTrue(EnergyCalc.canCreateOn(d(2026, 11, 5), today))
    }

    @Test
    fun `어제의 할 일만 늦었다`() {
        assertTrue(EnergyCalc.isLate(TaskStatus.PLANNED, d(2026, 11, 3), today))
        assertFalse(EnergyCalc.isLate(TaskStatus.DONE, d(2026, 11, 3), today))
        assertFalse(EnergyCalc.isLate(TaskStatus.PLANNED, today, today))
    }

    @Test
    fun `오늘과 지난 날과 지난주 할 일은 했어요로 바꿀 수 있다`() {
        assertNull(EnergyCalc.canComplete(today, today))
        assertNull(EnergyCalc.canComplete(d(2026, 11, 3), today))
        assertNull(EnergyCalc.canComplete(d(2026, 10, 27), today))
    }

    @Test
    fun `잠금선 앞 할 일은 했어요로 바꿀 수 없다`() {
        assertEquals(ErrorCode.DATE_LOCKED, EnergyCalc.canComplete(d(2026, 10, 25), today))
    }

    @Test
    fun `내일 할 일은 미리 했어요로 바꿀 수 없다`() {
        assertEquals(ErrorCode.FUTURE_TASK_NOT_COMPLETABLE, EnergyCalc.canComplete(d(2026, 11, 5), today))
    }

    private fun oneTime(
        date: LocalDate,
        slot: TimeSlot = TimeSlot.MORNING,
        status: TaskStatus = TaskStatus.PLANNED,
    ) = MoveSubject(status, date, slot, false, null)

    private fun routine(
        date: LocalDate,
        occurrence: LocalDate = date,
    ) = MoveSubject(TaskStatus.PLANNED, date, TimeSlot.MORNING, true, occurrence)

    @Test
    fun `했어요인 할 일은 옮길 수 없다`() {
        val s = oneTime(today, status = TaskStatus.DONE)
        assertEquals(ErrorCode.TASK_DONE_NOT_MOVABLE, EnergyCalc.checkMove(s, d(2026, 11, 5), TimeSlot.MORNING, today))
    }

    @Test
    fun `잠긴 날의 할 일은 옮길 수 없다`() {
        val s = oneTime(d(2026, 10, 25))
        assertEquals(ErrorCode.DATE_LOCKED, EnergyCalc.checkMove(s, today, TimeSlot.MORNING, today))
    }

    @Test
    fun `잠긴 날로는 옮길 수 없다`() {
        assertEquals(ErrorCode.DATE_LOCKED, EnergyCalc.checkMove(oneTime(today), d(2026, 10, 25), TimeSlot.MORNING, today))
    }

    @Test
    fun `매주 하는 일은 다음 주로 옮길 수 없다`() {
        val s = routine(today)
        assertEquals(ErrorCode.ROUTINE_TASK_OTHER_WEEK, EnergyCalc.checkMove(s, d(2026, 11, 9), TimeSlot.MORNING, today))
    }

    @Test
    fun `매주 하는 일은 같은 주의 어제로 옮길 수 있다`() {
        assertNull(EnergyCalc.checkMove(routine(today), d(2026, 11, 3), TimeSlot.MORNING, today))
    }

    @Test
    fun `지난주 매주 하는 일은 지난주 안에서 옮길 수 있다`() {
        assertNull(EnergyCalc.checkMove(routine(d(2026, 10, 28)), d(2026, 10, 27), TimeSlot.MORNING, today))
    }

    @Test
    fun `지난주 매주 하는 일은 이번 주로 옮길 수 없다`() {
        val s = routine(d(2026, 10, 28))
        assertEquals(ErrorCode.ROUTINE_TASK_OTHER_WEEK, EnergyCalc.checkMove(s, d(2026, 11, 3), TimeSlot.MORNING, today))
    }

    @Test
    fun `매주 하는 일은 옮긴 날이 아니라 원래 회차 날짜의 주를 본다`() {
        assertNull(EnergyCalc.checkMove(routine(d(2026, 11, 8), d(2026, 11, 2)), d(2026, 11, 2), TimeSlot.MORNING, today))
    }

    @Test
    fun `이번만 할 일은 잠금선 뒤 지난 날로 옮길 수 있다`() {
        assertNull(EnergyCalc.checkMove(oneTime(today), d(2026, 10, 27), TimeSlot.MORNING, today))
    }

    @Test
    fun `이번만 할 일은 먼 앞날로 옮길 수 있다`() {
        assertNull(EnergyCalc.checkMove(oneTime(today), d(2026, 12, 31), TimeSlot.MORNING, today))
    }

    @Test
    fun `같은 날 같은 시간대로는 옮길 수 없다`() {
        assertEquals(ErrorCode.MOVE_SAME_PLACE, EnergyCalc.checkMove(oneTime(today), today, TimeSlot.MORNING, today))
    }

    @Test
    fun `같은 날 다른 시간대로는 옮길 수 있다`() {
        assertNull(EnergyCalc.checkMove(oneTime(today), today, TimeSlot.EVENING, today))
    }

    @Test
    fun `했어요 검사가 잠금 검사보다 먼저다`() {
        val s = oneTime(d(2026, 10, 20), status = TaskStatus.DONE)
        assertEquals(ErrorCode.TASK_DONE_NOT_MOVABLE, EnergyCalc.checkMove(s, d(2026, 10, 20), TimeSlot.MORNING, today))
    }

    @Test
    fun `옮긴 기록은 28일 전 0시보다 앞선 것을 지운다`() {
        assertEquals(LocalDateTime.of(2026, 10, 7, 0, 0), EnergyCalc.moveHistoryCutoff(today))
    }

    @Test
    fun `요일 묶음은 1부터 127까지만 맞다`() {
        listOf(0, 128, 255, -1).forEach { assertFalse(EnergyCalc.isValidWeekdays(it), "$it") }
        listOf(1, 127).forEach { assertTrue(EnergyCalc.isValidWeekdays(it), "$it") }
    }

    @Test
    fun `21은 월수금이다`() {
        val mwf = setOf(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY)
        assertEquals(mwf, EnergyCalc.maskToWeekdays(21))
        assertEquals(21, EnergyCalc.weekdaysToMask(mwf))
    }

    @Test
    fun `127은 일주일 전부다`() {
        assertEquals(DayOfWeek.entries.toSet(), EnergyCalc.maskToWeekdays(127))
        assertEquals(127, EnergyCalc.weekdaysToMask(DayOfWeek.entries.toSet()))
    }

    private val start = d(2026, 11, 4)

    @Test
    fun `이번 주 회차는 오늘부터만 생긴다`() {
        assertEquals(
            listOf(d(2026, 11, 4), d(2026, 11, 6)),
            EnergyCalc.occurrenceDates(21, start, null, d(2026, 11, 2), today),
        )
    }

    @Test
    fun `다음 주 회차는 고른 요일마다 생긴다`() {
        assertEquals(
            listOf(d(2026, 11, 9), d(2026, 11, 11), d(2026, 11, 13)),
            EnergyCalc.occurrenceDates(21, start, null, d(2026, 11, 9), today),
        )
    }

    @Test
    fun `지난주 회차는 생기지 않는다`() {
        assertEquals(emptyList(), EnergyCalc.occurrenceDates(21, d(2026, 10, 1), null, d(2026, 10, 26), today))
    }

    @Test
    fun `8주 뒤 회차는 해를 넘겨도 생긴다`() {
        assertEquals(
            listOf(d(2026, 12, 28), d(2026, 12, 30), d(2027, 1, 1)),
            EnergyCalc.occurrenceDates(21, start, null, d(2026, 12, 28), today),
        )
    }

    @Test
    fun `9주 뒤 회차는 생기지 않는다`() {
        assertEquals(emptyList(), EnergyCalc.occurrenceDates(21, start, null, d(2027, 1, 4), today))
    }

    @Test
    fun `시작일 앞에는 회차가 없다`() {
        assertEquals(
            listOf(d(2026, 11, 11), d(2026, 11, 13)),
            EnergyCalc.occurrenceDates(21, d(2026, 11, 11), null, d(2026, 11, 9), today),
        )
    }

    @Test
    fun `끝나는 날 뒤에는 회차가 없다`() {
        assertEquals(
            listOf(d(2026, 11, 9), d(2026, 11, 11)),
            EnergyCalc.occurrenceDates(21, start, d(2026, 11, 11), d(2026, 11, 9), today),
        )
    }

    @Test
    fun `매일이면 다음 주 7일 모두 생긴다`() {
        assertEquals(
            EnergyCalc.weekDates(d(2026, 11, 9)),
            EnergyCalc.occurrenceDates(127, start, null, d(2026, 11, 9), today),
        )
    }

    @Test
    fun `끝나는 날이 없거나 앞날이면 오늘로 끝낸다`() {
        assertEquals(today, EnergyCalc.routineEndDate(null, today))
        assertEquals(today, EnergyCalc.routineEndDate(d(2026, 12, 31), today))
    }

    @Test
    fun `이미 지난 끝나는 날은 그대로 둔다`() {
        assertEquals(d(2026, 11, 1), EnergyCalc.routineEndDate(d(2026, 11, 1), today))
    }

    @Test
    fun `이번 주 링크는 이번 주 일요일까지다`() {
        assertEquals(d(2026, 11, 8), EnergyCalc.expireDateFor(LinkExpiry.THIS_WEEK, today))
    }

    @Test
    fun `4주 링크는 이번 주 월요일부터 27일 뒤까지다`() {
        assertEquals(d(2026, 11, 29), EnergyCalc.expireDateFor(LinkExpiry.FOUR_WEEKS, today))
    }

    @Test
    fun `기한 없는 링크는 만료일이 없다`() {
        assertNull(EnergyCalc.expireDateFor(LinkExpiry.NONE, today))
    }

    @Test
    fun `열린 링크는 만료일이 없거나 오늘 이후면 열려 있다`() {
        assertTrue(EnergyCalc.isLinkOpen(ShareLinkStatus.OPEN, null, today))
        assertTrue(EnergyCalc.isLinkOpen(ShareLinkStatus.OPEN, d(2026, 11, 8), today))
        assertTrue(EnergyCalc.isLinkOpen(ShareLinkStatus.OPEN, today, today))
    }

    @Test
    fun `만료일이 지난 링크는 닫혀 있다`() {
        assertFalse(EnergyCalc.isLinkOpen(ShareLinkStatus.OPEN, d(2026, 11, 3), today))
    }

    @Test
    fun `닫거나 지운 링크는 닫혀 있다`() {
        assertFalse(EnergyCalc.isLinkOpen(ShareLinkStatus.CLOSED, null, today))
        assertFalse(EnergyCalc.isLinkOpen(ShareLinkStatus.DELETED, null, today))
    }

    private val walk = VisibilityTask(1L, TaskStatus.PLANNED, today, false)
    private val pill = VisibilityTask(2L, TaskStatus.PLANNED, today, false)
    private val dinner = VisibilityTask(null, TaskStatus.PLANNED, today, true)
    private val dentist = VisibilityTask(null, TaskStatus.PLANNED, today, false)
    private val exercise = VisibilityLink(ShareLinkStatus.OPEN, null, false, setOf(1L))
    private val family = VisibilityLink(ShareLinkStatus.OPEN, null, true, emptySet())

    @Test
    fun `산책은 운동 링크에만 보인다`() {
        assertTrue(EnergyCalc.isVisibleOnLink(walk, exercise, today))
        assertFalse(EnergyCalc.isVisibleOnLink(walk, family, today))
    }

    @Test
    fun `약 먹기는 어느 링크에도 안 보인다`() {
        assertFalse(EnergyCalc.isVisibleOnLink(pill, exercise, today))
        assertFalse(EnergyCalc.isVisibleOnLink(pill, family, today))
    }

    @Test
    fun `가족 저녁은 가족 링크에만 보인다`() {
        assertFalse(EnergyCalc.isVisibleOnLink(dinner, exercise, today))
        assertTrue(EnergyCalc.isVisibleOnLink(dinner, family, today))
    }

    @Test
    fun `치과는 어느 링크에도 안 보인다`() {
        assertFalse(EnergyCalc.isVisibleOnLink(dentist, exercise, today))
        assertFalse(EnergyCalc.isVisibleOnLink(dentist, family, today))
    }

    @Test
    fun `지운 할 일은 안 보인다`() {
        assertFalse(EnergyCalc.isVisibleOnLink(walk.copy(status = TaskStatus.DELETED), exercise, today))
        assertFalse(EnergyCalc.isVisibleOnLink(dinner.copy(status = TaskStatus.DELETED), family, today))
    }

    @Test
    fun `지난주와 다음 주 할 일은 안 보인다`() {
        assertFalse(EnergyCalc.isVisibleOnLink(walk.copy(plannedDate = d(2026, 11, 1)), exercise, today))
        assertFalse(EnergyCalc.isVisibleOnLink(walk.copy(plannedDate = d(2026, 11, 9)), exercise, today))
        assertTrue(EnergyCalc.isVisibleOnLink(walk.copy(plannedDate = d(2026, 11, 8)), exercise, today))
    }

    @Test
    fun `닫힌 링크와 만료된 링크에는 안 보인다`() {
        assertFalse(EnergyCalc.isVisibleOnLink(walk, exercise.copy(status = ShareLinkStatus.CLOSED), today))
        assertFalse(EnergyCalc.isVisibleOnLink(walk, exercise.copy(expireDate = d(2026, 11, 3)), today))
    }

    @Test
    fun `이번만 할 일은 보이기를 켜도 칩이 꺼져 있으면 안 보인다`() {
        assertFalse(EnergyCalc.isVisibleOnLink(dinner, family.copy(isOneTimeVisible = false), today))
    }

    @Test
    fun `매주 하는 일은 할 일의 보이기 값과 상관없다`() {
        assertTrue(EnergyCalc.isVisibleOnLink(walk.copy(isVisible = true), exercise, today))
        assertTrue(EnergyCalc.isVisibleOnLink(walk.copy(isVisible = false), exercise, today))
        assertFalse(EnergyCalc.isVisibleOnLink(pill.copy(isVisible = true), family, today))
    }

    @Test
    fun `친구 화면 상태는 했어요와 못 했어요와 할 일로 나뉜다`() {
        assertEquals(PublicTaskStatus.DONE, EnergyCalc.publicStatus(TaskStatus.DONE, d(2026, 11, 3), today))
        assertEquals(PublicTaskStatus.MISSED, EnergyCalc.publicStatus(TaskStatus.PLANNED, d(2026, 11, 3), today))
        assertEquals(PublicTaskStatus.PLANNED, EnergyCalc.publicStatus(TaskStatus.PLANNED, today, today))
        assertEquals(PublicTaskStatus.PLANNED, EnergyCalc.publicStatus(TaskStatus.PLANNED, d(2026, 11, 5), today))
    }

    private val loginAt = LocalDateTime.of(2026, 11, 4, 10, 0, 0)

    @Test
    fun `로그인하고 4분 59초면 최근 로그인이다`() {
        assertTrue(EnergyCalc.isRecentLogin(loginAt, loginAt, loginAt.plusMinutes(4).plusSeconds(59)))
    }

    @Test
    fun `로그인하고 5분 정각이면 최근 로그인이다`() {
        assertTrue(EnergyCalc.isRecentLogin(loginAt, loginAt, loginAt.plusMinutes(5)))
    }

    @Test
    fun `로그인하고 5분 1초면 최근 로그인이 아니다`() {
        assertFalse(EnergyCalc.isRecentLogin(loginAt, loginAt, loginAt.plusMinutes(5).plusSeconds(1)))
    }

    @Test
    fun `옛 토큰이면 최근 로그인이 아니다`() {
        assertFalse(EnergyCalc.isRecentLogin(loginAt.minusHours(1), loginAt, loginAt.plusMinutes(1)))
    }

    @Test
    fun `로그인 기록이 없으면 최근 로그인이 아니다`() {
        assertFalse(EnergyCalc.isRecentLogin(loginAt, null, loginAt.plusMinutes(1)))
    }

    @Test
    fun `밀리초만 다르면 같은 로그인이다`() {
        val iat = loginAt
        val last = loginAt.plusNanos(345_000_000)
        assertTrue(EnergyCalc.isRecentLogin(iat, last, loginAt.plusMinutes(1)))
    }
}
