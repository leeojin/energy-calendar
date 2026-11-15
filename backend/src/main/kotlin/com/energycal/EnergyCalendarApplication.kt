package com.energycal

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class EnergyCalendarApplication

fun main(args: Array<String>) {
    runApplication<EnergyCalendarApplication>(*args)
}
