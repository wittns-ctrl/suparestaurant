import { IsUUID } from 'class-validator';

// The token must be a plain UUID string. Without this, a JSON body such as
// {"token": {"$ne": null}} was passed straight into the Mongo filter and
// could unsubscribe arbitrary subscribers.
export class NewsletterUnsubscribeDto {
  @IsUUID('4')
  token!: string;
}
