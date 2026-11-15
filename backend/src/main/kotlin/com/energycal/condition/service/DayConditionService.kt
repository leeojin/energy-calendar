package com.energycal.condition.service

import com.energycal.calc.EnergyCalc
import com.energycal.common.BusinessException
import com.energycal.common.ErrorCode
import com.energycal.condition.dto.DayConditionResponse
import com.energycal.condition.entity.ConditionLevel
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime

@Service
class DayConditionService(
    private val dayConditionWriter: DayConditionWriter,
    private val clock: Clock,
) {
    // 유니크 충돌은 저장 트랜잭션 밖에서 처리
    fun updateCondition(
        accountId: Long,
        date: LocalDate,
        level: ConditionLevel,
    ): DayConditionResponse {
        if (!EnergyCalc.canCreateOn(date, EnergyCalc.today(clock))) {
            throw BusinessException(ErrorCode.DATE_IN_PAST)
        }
        val now = LocalDateTime.now(clock)
        return try {
            dayConditionWriter.upsert(accountId, date, level, now)
        } catch (e: DataIntegrityViolationException) {
            dayConditionWriter.upsert(accountId, date, level, now)
        }
    }
}
