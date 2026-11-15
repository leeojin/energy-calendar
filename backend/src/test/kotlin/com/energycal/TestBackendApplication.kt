package com.energycal

import org.springframework.boot.fromApplication
import org.springframework.boot.with

fun main(args: Array<String>) {
    fromApplication<EnergyCalendarApplication>().with(TestcontainersConfiguration::class).run(*args)
}
