package com.energycal.task.dto

import com.energycal.common.AllowedText
import com.fasterxml.jackson.annotation.JsonProperty
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min

data class TaskUpdateRequest(
    @field:AllowedText(min = 1, max = 20)
    val name: String? = null,
    @field:Min(1)
    @field:Max(10)
    val energyCost: Int? = null,
    @param:JsonProperty("isVisible")
    @get:JsonProperty("isVisible")
    val isVisible: Boolean? = null,
) {
    fun isEmpty(): Boolean = name == null && energyCost == null && isVisible == null
}
