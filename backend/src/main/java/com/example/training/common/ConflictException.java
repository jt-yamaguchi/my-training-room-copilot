package com.example.training.common;

/**
 * リソースの状態が競合する場合にServiceレイヤーから送出する例外。
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
