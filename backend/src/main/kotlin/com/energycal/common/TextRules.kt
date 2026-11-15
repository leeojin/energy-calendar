package com.energycal.common

object TextRules {
    private val allowedAsciiPunctuation = setOf('.', ',', '!', '?', '~', '-', '(', ')', ':', '/', ' ').map { it.code }.toSet()

    // frontend/src/lib/text.ts와 동일한 문자 범위
    private val allowedRanges: List<IntRange> =
        listOf(
            0xAC00..0xD7A3,
            0x3131..0x318E,
            0x1F000..0x1FAFF,
            0x2600..0x27BF,
            0x2300..0x23FF,
            0x2B00..0x2BFF,
            0x2190..0x21FF,
            0xE0020..0xE007F,
        )

    private val allowedSingles: Set<Int> =
        setOf(0x3030, 0x303D, 0x3297, 0x3299, 0x00A9, 0x00AE, 0x2122, 0x203C, 0x2049, 0xFE0F, 0x200D, 0x20E3)

    fun codePointLength(text: String): Int = text.codePointCount(0, text.length)

    fun isBlankText(text: String): Boolean = text.trim().isEmpty()

    fun isAllowed(text: String): Boolean = text.codePoints().allMatch { isAllowedCodePoint(it) }

    fun isValid(
        text: String,
        min: Int,
        max: Int,
    ): Boolean {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return false
        val length = codePointLength(trimmed)
        return length in min..max && isAllowed(trimmed)
    }

    private fun isAllowedCodePoint(cp: Int): Boolean =
        cp in 'a'.code..'z'.code ||
            cp in 'A'.code..'Z'.code ||
            cp in '0'.code..'9'.code ||
            cp in allowedAsciiPunctuation ||
            cp in allowedSingles ||
            allowedRanges.any { cp in it }
}
