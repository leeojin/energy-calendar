package com.energycal.condition.service

import com.energycal.condition.dto.DayConditionResponse
import com.energycal.condition.dto.toResponse
import com.energycal.condition.entity.AccountDayCondition
import com.energycal.condition.entity.ConditionLevel
import com.energycal.condition.repository.AccountDayConditionRepository
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime

@Component
class DayConditionWriter(
    private val accountDayConditionRepository: AccountDayConditionRepository,
) {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun upsert(
        accountId: Long,
        date: LocalDate,
        level: ConditionLevel,
        now: LocalDateTime,
    ): DayConditionResponse {
        val existing = accountDayConditionRepository.findByAccountIdAndConditionDate(accountId, date)
        if (existing != null) {
            existing.conditionLevel = level
            existing.updatedAt = now
            return existing.toResponse()
        }
        return accountDayConditionRepository
            .saveAndFlush(
                AccountDayCondition(
                    accountId = accountId,
                    conditionDate = date,
                    conditionLevel = level,
                    createdAt = now,
                    updatedAt = now,
                ),
            ).toResponse()
    }
}
