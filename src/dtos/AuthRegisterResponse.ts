import { UserPublicDto } from "./UserPublicDto";
import { AuthTokensResponse } from "./AuthTokensResponse";

export interface AuthRegisterResponse {
  user: UserPublicDto;
  tokens: AuthTokensResponse;
}
