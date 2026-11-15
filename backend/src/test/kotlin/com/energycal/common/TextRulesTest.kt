package com.energycal.common

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class TextRulesTest {
    @Test
    fun `글자 수는 코드 포인트로 센다`() {
        assertEquals(3, TextRules.codePointLength("산책🌿"))
    }

    @Test
    fun `한글 영문 숫자 공백 기본 문장부호는 허용한다`() {
        assertTrue(TextRules.isAllowed("산책 Walk 10"))
        assertTrue(TextRules.isAllowed(". , ! ? ~ - ( ) : /"))
        assertTrue(TextRules.isAllowed("ㅋㅋ ㅠㅠ"))
    }

    @Test
    fun `이모지는 허용한다`() {
        assertTrue(TextRules.isAllowed("👏"))
        assertTrue(TextRules.isAllowed("👍🏻"))
        assertTrue(TextRules.isAllowed("👨‍👩‍👧"))
        assertTrue(TextRules.isAllowed("🇰🇷"))
        assertTrue(TextRules.isAllowed("❤️"))
        assertTrue(TextRules.isAllowed("화이팅 👏 잘했어!"))
    }

    @Test
    fun `HTML 특수 문자는 거부한다`() {
        listOf("<", ">", "\"", "'", "&", "`").forEach {
            assertFalse(TextRules.isAllowed("안녕$it"), "거부해야 함: $it")
        }
    }

    @Test
    fun `줄바꿈 탭 세미콜론 등호는 거부한다`() {
        listOf("\n", "\r", "\t", ";", "=").forEach {
            assertFalse(TextRules.isAllowed("가${it}나"), "거부해야 함: ${it.codePointAt(0)}")
        }
    }

    @Test
    fun `공백만 있으면 빈 글자로 본다`() {
        assertTrue(TextRules.isBlankText("   "))
        assertTrue(TextRules.isBlankText(""))
        assertFalse(TextRules.isBlankText(" 가 "))
    }

    @Test
    fun `20 코드 포인트는 통과하고 21은 넘는다`() {
        val twenty = "가".repeat(19) + "🌿"
        val twentyOne = twenty + "나"
        assertEquals(20, TextRules.codePointLength(twenty))
        assertEquals(21, TextRules.codePointLength(twentyOne))
        assertTrue(TextRules.isValid(twenty, 1, 20))
        assertFalse(TextRules.isValid(twentyOne, 1, 20))
    }

    @Test
    fun `검사는 앞뒤 공백을 뺀 값으로 한다`() {
        assertTrue(TextRules.isValid("  산책  ", 1, 2))
        assertFalse(TextRules.isValid("   ", 1, 20))
        assertFalse(TextRules.isValid("산책<", 1, 20))
    }
}
