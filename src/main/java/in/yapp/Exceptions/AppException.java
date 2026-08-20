package in.yapp.Exceptions;


import lombok.Data;
import lombok.RequiredArgsConstructor;

@Data
@RequiredArgsConstructor
public class AppException extends RuntimeException
{
    private final ErrorCode errorCode;

    public AppException(String message,ErrorCode errorCode)
    {
        super(message);
        this.errorCode = errorCode;
    }



}
