package com.energycal.task.job

import com.energycal.calc.EnergyCalc
import com.energycal.task.repository.TaskMoveHistoryRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.scheduling.support.CronExpression
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.ZonedDateTime

@Component
class MoveHistoryCleanupJob(
    private val taskMoveHistoryRepository: TaskMoveHistoryRepository,
    private val clock: Clock,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(cron = CRON, zone = ZONE)
    @Transactional
    fun deleteOldMoveHistory() {
        val cutoff = EnergyCalc.moveHistoryCutoff(EnergyCalc.today(clock))
        val deleted = taskMoveHistoryRepository.deleteByCreatedAtBefore(cutoff)
        log.info("옮긴 기록 정리 작업: {}보다 앞선 기록 {}줄 지움", cutoff, deleted)
    }

    @EventListener(ApplicationReadyEvent::class)
    fun logNextRun() {
        val next = CronExpression.parse(CRON).next(ZonedDateTime.now(clock.withZone(EnergyCalc.ZONE)))
        log.info("옮긴 기록 정리 작업 다음 실행: {}", next?.toLocalDateTime())
    }

    companion object {
        const val CRON = "0 30 3 * * *"
        const val ZONE = "Asia/Seoul"
    }
}
