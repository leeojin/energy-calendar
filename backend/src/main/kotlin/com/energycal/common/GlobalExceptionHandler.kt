package com.energycal.common

import jakarta.persistence.OptimisticLockException
import jakarta.validation.ConstraintViolationException
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.orm.ObjectOptimisticLockingFailureException
import org.springframework.web.HttpMediaTypeNotSupportedException
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.HandlerMethodValidationException
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.servlet.NoHandlerFoundException
import org.springframework.web.servlet.resource.NoResourceFoundException

@RestControllerAdvice
class GlobalExceptionHandler {
    private val log = LoggerFactory.getLogger(javaClass)

    @ExceptionHandler(BusinessException::class)
    fun handleBusiness(e: BusinessException): ResponseEntity<ErrorResponse> = respond(e.errorCode)

    @ExceptionHandler(
        MethodArgumentNotValidException::class,
        HandlerMethodValidationException::class,
        ConstraintViolationException::class,
        HttpMessageNotReadableException::class,
        MethodArgumentTypeMismatchException::class,
        MissingServletRequestParameterException::class,
        HttpMediaTypeNotSupportedException::class,
    )
    fun handleValidation(e: Exception): ResponseEntity<ErrorResponse> = respond(ErrorCode.VALIDATION_FAILED)

    @ExceptionHandler(NoResourceFoundException::class, NoHandlerFoundException::class)
    fun handleNotFound(e: Exception): ResponseEntity<ErrorResponse> = respond(ErrorCode.NOT_FOUND)

    @ExceptionHandler(HttpRequestMethodNotSupportedException::class)
    fun handleMethodNotAllowed(e: Exception): ResponseEntity<ErrorResponse> = respond(ErrorCode.METHOD_NOT_ALLOWED)

    @ExceptionHandler(ObjectOptimisticLockingFailureException::class, OptimisticLockException::class)
    fun handleConcurrentUpdate(e: Exception): ResponseEntity<ErrorResponse> = respond(ErrorCode.CONCURRENT_UPDATE)

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(e: Exception): ResponseEntity<ErrorResponse> {
        log.error("처리하지 못한 예외", e)
        return respond(ErrorCode.INTERNAL_ERROR)
    }

    private fun respond(errorCode: ErrorCode): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(errorCode.httpStatus).body(ErrorResponse.of(errorCode))
}
