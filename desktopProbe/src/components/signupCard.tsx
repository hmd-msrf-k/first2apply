import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function SignupCard() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Sign up</CardTitle>
        <CardDescription className="text-center">
          select your preferred method to get started
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 pb-6">
        <Button variant="outline">
          <Icons.google className="mr-2 h-4 w-4" />
          Google
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="name@example.com" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button className="w-full">Create account</Button>
        <p className="text-xs">
          Already have an account?{" "}
          <a href="" className="text-green-700 hover:underline">
            Log in
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
