package com.energycal.common

import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext

class PasswordValidator : ConstraintValidator<Password, String> {
    override fun isValid(
        value: String?,
        context: ConstraintValidatorContext,
    ): Boolean {
        if (value == null) return false
        return value.length in MIN_LENGTH..MAX_LENGTH && value.all { it in '!'..'~' } && kindsOf(value) >= MIN_KINDS
    }

    private fun kindsOf(value: String): Int =
        listOf(
            value.any { it in 'A'..'Z' },
            value.any { it in 'a'..'z' },
            value.any { it in '0'..'9' },
            value.any { !it.isLetterOrDigit() },
        ).count { it }

    companion object {
        const val MIN_LENGTH = 8
        const val MAX_LENGTH = 16
        const val MIN_KINDS = 3
    }
}
