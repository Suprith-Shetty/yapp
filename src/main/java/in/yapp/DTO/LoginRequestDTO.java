package in.yapp.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequestDTO
{
    @NotBlank(message = "Usename or email is required")
    private String identifier;

    @NotBlank
    private String password;

}
