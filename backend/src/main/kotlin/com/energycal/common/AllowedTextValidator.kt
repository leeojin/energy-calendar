package com.energycal.common

import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext

class AllowedTextValidator : ConstraintValidator<AllowedText, String> {
    private var min = 1
    private var max = 20

    override fun initialize(annotation: AllowedText) {
        min = annotation.min
        max = annotation.max
    }

    override fun isValid(
        value: String?,
        context: ConstraintValidatorContext,
    ): Boolean = value == null || TextRules.isValid(value, min, max)
}
